"""One-shot SQLite + asset backup, checksum verification, and isolated restoration."""

import hashlib
import json
import sqlite3
import tempfile
import zipfile
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4
from flask import current_app
from app import ROOT, db


def digest(data):
    return hashlib.sha256(data).hexdigest()


def verify_backup(path):
    with zipfile.ZipFile(path) as archive:
        manifest = json.loads(archive.read("manifest.json"))
        if manifest.get("format") != "ilab-backup-v2":
            raise ValueError("Unsupported backup format")
        expected = manifest["files"]
        if set(archive.namelist()) != set(expected) | {"manifest.json"}:
            raise ValueError("Unexpected or missing backup members")
        for name, checksum in expected.items():
            parts = Path(name)
            if parts.is_absolute() or ".." in parts.parts or ":" in name or "\\" in name:
                raise ValueError("Unsafe archive path")
            if digest(archive.read(name)) != checksum:
                raise ValueError(f"Checksum mismatch: {name}")
        with tempfile.TemporaryDirectory(prefix="ilab-verify-") as directory:
            database = Path(directory) / "check.db"
            database.write_bytes(archive.read("instance/ilab.db"))
            connection = sqlite3.connect(f"{database.as_uri()}?mode=ro", uri=True)
            try:
                if connection.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
                    raise ValueError("Database integrity check failed")
                if connection.execute("PRAGMA foreign_key_check").fetchall():
                    raise ValueError("Database foreign-key check failed")
                count = connection.execute("SELECT count(*) FROM item").fetchone()[0]
            finally:
                connection.close()
        return {"items": count, "files": len(expected), "verified": True}


def create_backup(directory):
    if db.engine.dialect.name != "sqlite":
        raise ValueError(
            "This backup command supports SQLite. Export PostgreSQL with pg_dump plus static assets."
        )
    destination = Path(directory).resolve()
    destination.mkdir(parents=True, exist_ok=True)
    name = f"ilab-{datetime.now(timezone.utc):%Y%m%dT%H%M%SZ}-{uuid4().hex[:8]}.zip"
    final = destination / name
    partial = destination / (name + ".partial")
    manifest = {"format": "ilab-backup-v2", "files": {}}
    try:
        with tempfile.TemporaryDirectory(prefix="ilab-backup-", dir=destination) as temporary:
            snapshot = Path(temporary) / "ilab.db"
            source = db.engine.raw_connection()
            target = sqlite3.connect(snapshot)
            try:
                source.driver_connection.backup(target)
            finally:
                target.close()
                source.close()
            with zipfile.ZipFile(partial, "w", zipfile.ZIP_DEFLATED) as archive:

                def add(name, content):
                    archive.writestr(name, content)
                    manifest["files"][name] = digest(content)

                add("instance/ilab.db", snapshot.read_bytes())
                with closing(sqlite3.connect(snapshot)) as snapshot_connection:
                    snapshot_connection.row_factory = sqlite3.Row
                    export = {
                        "maps": [dict(row) for row in snapshot_connection.execute("SELECT * FROM map")],
                        "items": [dict(row) for row in snapshot_connection.execute("SELECT * FROM item")],
                    }
                    for item in export["items"]:
                        if item.get("provenance"):
                            item["provenance"] = json.loads(item["provenance"])
                add("inventory.json", json.dumps(export, indent=2).encode("utf8"))
                asset_root = Path(current_app.config.get("BACKUP_ASSET_ROOT", ROOT / "static")).resolve()
                for sub in ("uploads", "thumbnails", "maps", "optimized", "legacy"):
                    for file in sorted((asset_root / sub).rglob("*")):
                        if (
                            file.is_file()
                            and not file.is_symlink()
                            and file.resolve().is_relative_to(asset_root)
                        ):
                            add("static/" + file.relative_to(asset_root).as_posix(), file.read_bytes())
                for name in ("iLab.gltf", "iLab.bin", "occ2.png"):
                    file = asset_root / name
                    if file.is_file():
                        add("static/" + name, file.read_bytes())
                archive.writestr("manifest.json", json.dumps(manifest, indent=2))
            verify_backup(partial)
            partial.rename(final)
        return final
    except Exception:
        partial.unlink(missing_ok=True)
        raise


def restore_backup(archive_path, destination):
    verify_backup(archive_path)
    destination = Path(destination).resolve()
    if destination.exists():
        raise ValueError("Restore into a new directory; existing data is never overwritten.")
    destination.mkdir(parents=True)
    with zipfile.ZipFile(archive_path) as archive:
        for name in archive.namelist():
            if name == "manifest.json":
                continue
            target = (destination / name).resolve()
            if not target.is_relative_to(destination):
                raise ValueError("Unsafe archive path")
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(archive.read(name))
    return destination


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", default=str(ROOT / "backups"))
    parser.add_argument("--verify")
    parser.add_argument("--restore")
    parser.add_argument("--destination")
    args = parser.parse_args()
    if args.verify:
        print(json.dumps(verify_backup(args.verify)))
    elif args.restore:
        if not args.destination:
            parser.error("--restore requires --destination (a new folder)")
        print(restore_backup(args.restore, args.destination))
    else:
        from app import create_app

        with create_app().app_context():
            print(create_backup(args.directory))
