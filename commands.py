"""Explicit, idempotent setup and maintenance commands."""

import json
from pathlib import Path
import click
from flask import current_app
from flask_migrate import upgrade
from sqlalchemy import select
from app import db, ROOT
from models import Item, Map, ItemHistory


def seed_maps():
    maps = [
        dict(
            id=1,
            name="iLab",
            svg_path="/static/maps/main.png",
            model_path="/static/optimized/iLab.gltf",
            width=1024,
            height=1024,
        ),
        dict(id=2, name="Closet", svg_path="/static/maps/closet.svg", width=1312.74, height=864),
    ]
    for values in maps:
        if not db.session.get(Map, values["id"]):
            db.session.add(Map(**values))
    db.session.commit()


def import_recovery(path):
    seed_maps()
    items = json.loads(Path(path).read_text(encoding="utf8"))
    count = 0
    for row in items:
        if db.session.scalar(select(Item.id).where(Item.recovery_key == row["recovery_key"])):
            continue
        if not db.session.get(Map, row["map_id"]):
            db.session.add(
                Map(
                    id=row["map_id"],
                    name=f"Recovered map {row['map_id']}",
                    svg_path="/static/maps/main.png",
                    width=1000,
                    height=1000,
                )
            )
            db.session.flush()
        item = Item(**row)
        db.session.add(item)
        db.session.flush()
        db.session.add(ItemHistory(item_id=item.id, action="recovered", snapshot=item.to_dict()))
        count += 1
    db.session.commit()
    return count


def register_commands(app):
    @app.cli.command("init-db")
    def init_database():
        """Apply the new-database baseline and seed maps; never drop existing data."""
        upgrade()
        seed_maps()
        click.echo("Database ready.")

    @app.cli.command("import-recovery")
    @click.option(
        "--source", type=click.Path(exists=True), default=str(ROOT / "data/recovered-inventory.json")
    )
    def restore_inventory(source):
        """Import recovered candidates once, without overwriting edited records."""
        click.echo(f"Imported {import_recovery(source)} recovered records.")

    @app.cli.command("set-password")
    @click.password_option(confirmation_prompt=True)
    def set_password(password):
        """Change the local staff password (restart the server afterward)."""
        if len(password) < 12:
            raise click.ClickException("Use at least 12 characters.")
        (Path(current_app.instance_path) / "admin-password.txt").write_text(password, encoding="utf8")
        click.echo(
            "Password changed. Restart the server. An ILAB_ADMIN_PASSWORD environment value takes precedence."
        )

    @app.cli.command("backup")
    @click.option("--directory", type=click.Path(), default=str(ROOT / "backups"))
    def backup(directory):
        from backup_db import create_backup

        click.echo(str(create_backup(directory)))
