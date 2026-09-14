import io
import json
import sqlite3
from pathlib import Path
from types import SimpleNamespace
import pytest
from PIL import Image
from sqlalchemy import select, func
from flask_migrate import upgrade
from app import db, ROOT
from commands import import_recovery
from models import Item, ItemHistory
from backup_db import create_backup, restore_backup, verify_backup


def png_bytes():
    stream = io.BytesIO()
    Image.new("RGB", (50, 50), "green").save(stream, "PNG")
    stream.seek(0)
    return stream


def test_health_and_security_headers(client):
    assert client.get("/api/health").json["status"] == "ok"
    response = client.get("/")
    assert response.status_code == 200
    assert "object-src 'none'" in response.headers["Content-Security-Policy"]
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert client.post("/api/items", json={"name": "x"}).status_code == 403
    token = client.get("/api/session").json["csrf"]
    assert client.post("/api/items", json={"name": "x"}, headers={"X-CSRF-Token": token}).status_code == 401


def test_edit_preserves_locations_and_can_clear_fields(staff, item):
    result = staff.patch(
        f"/api/items/{item['id']}",
        json={
            "revision": item["revision"],
            "name": "Renamed iron",
            "description": "",
            "link": "",
            "tags": "",
            "zone": "",
            "quantity": 0,
        },
    )
    assert result.status_code == 200, result.json
    saved = result.json
    assert [saved[k] for k in ("x_coord_model", "y_coord_model", "z_coord_model")] == [0, 1, 2]
    assert [saved[k] for k in ("description", "link", "tags", "zone")] == ["", "", "", ""]
    assert saved["quantity"] == 0
    assert staff.get("/api/items?stock=out").json["total"] == 1
    assert (
        staff.patch(
            f"/api/items/{item['id']}", json={"revision": item["revision"], "name": "Stale"}
        ).status_code
        == 409
    )
    assert staff.get("/api/items").json["total"] == 1


@pytest.mark.parametrize(
    "change",
    [
        {"quantity": -1},
        {"quantity": "oops"},
        {"quantity": 1.5},
        {"quantity": True},
        {"quantity": float("inf")},
        {"x_coord": "NaN"},
        {"x_coord": -1},
        {"y_coord": 99999},
        {"x_coord_model": None},
        {"map_id": 999},
        {"status": "bad"},
        {"link": "javascript:alert(1)"},
        {"link": "https://user:secret@example.com"},
        {"warning": "unknown"},
        {"name": ""},
        {"unknown": "field"},
    ],
)
def test_validation_is_transactional(staff, item, change):
    result = staff.patch(f"/api/items/{item['id']}", json={"revision": item["revision"], **change})
    assert result.status_code == 400, result.json
    assert staff.get(f"/api/items/{item['id']}").json["revision"] == item["revision"]


def test_search_pagination_and_literal_wildcards(staff, item):
    staff.post("/api/items", json={"name": "100% pure", "map_id": 2, "quantity": 0})
    assert staff.get("/api/items?q=%25").json["total"] == 1
    assert staff.get("/api/items?map_id=2").json["total"] == 1
    assert staff.get("/api/items?limit=1&page=2").json["items"][0]["name"] == "Soldering iron"


def test_archive_restore_and_history(staff, item):
    response = staff.delete(f"/api/items/{item['id']}", json={"revision": item["revision"]})
    assert response.status_code == 200
    assert staff.get("/api/items").json["total"] == 0
    history = staff.get(f"/api/items/{item['id']}/history").json
    snapshot = next(h for h in history if h["action"] == "archived")
    restored = staff.post(
        f"/api/items/{item['id']}/restore",
        json={"revision": response.json["revision"], "history_id": snapshot["id"]},
    )
    assert restored.json["status"] == "available"
    assert staff.get("/api/items").json["total"] == 1
    staff.post("/api/logout")
    assert staff.get(f"/api/items/{item['id']}/history").status_code == 401
    assert staff.get("/api/items?status=archived").status_code == 401


def test_images_reencoded_and_rejected_before_saving(staff, item, app):
    folder = Path(app.config["UPLOAD_FOLDER"])
    bad = staff.post(
        "/api/items",
        data={
            "payload": json.dumps({"name": "Bad file"}),
            "image": (io.BytesIO(b"<svg onload='alert(1)'/>"), "image.png"),
        },
    )
    assert bad.status_code == 400
    assert not list(folder.iterdir())
    invalid = staff.post(
        "/api/items",
        data={
            "payload": json.dumps({"name": "Bad quantity", "quantity": "oops"}),
            "image": (png_bytes(), "test.png"),
        },
    )
    assert invalid.status_code == 400
    assert not list(folder.iterdir())
    valid = staff.patch(
        f"/api/items/{item['id']}",
        data={
            "payload": json.dumps({"revision": item["revision"]}),
            "image": (png_bytes(), "arbitrary.html"),
        },
    )
    assert valid.status_code == 200
    file = folder / Path(valid.json["image_path"]).name
    assert Image.open(file).format == "WEBP"
    assert len(list(folder.iterdir())) == 1
    # Removed/replaced images stay available for undo and backup.
    deleted = staff.patch(
        f"/api/items/{item['id']}", json={"revision": valid.json["revision"], "remove_image": True}
    )
    assert deleted.json["image_path"] is None
    assert file.exists()


def test_local_finder_and_cloud_disabled(staff, item):
    response = staff.post("/api/chat", json={"message": "where are soldering tools?", "map_id": 1})
    assert response.json["mode"] == "local"
    assert response.json["markers"][0]["item_id"] == item["id"]
    assert staff.post("/api/chat", json={"message": "help", "cloud": True}).status_code == 503
    assert staff.post("/api/chat", json=[]).status_code == 400


def test_cloud_response_is_bounded_and_validates_ids(staff, item, app, monkeypatch):
    import openai

    captured = {}

    class FakeClient:
        def __init__(self, **kwargs):
            captured.update(kwargs)
            self.responses = self

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def create(self, **kwargs):
            captured.update(kwargs)
            return SimpleNamespace(
                output_text=json.dumps(
                    {"message": "Use the iron.", "item_ids": [item["id"], 99999, item["id"], True]}
                )
            )

    monkeypatch.setattr(openai, "OpenAI", FakeClient)
    app.config["AI_ENABLED"] = True
    response = staff.post("/api/chat", json={"message": "soldering", "cloud": True})
    assert response.status_code == 200, response.json
    assert response.json["markers"] == [{"item_id": item["id"], "reason": ""}]
    assert captured["store"] is False and captured["timeout"] == 25 and captured["max_retries"] == 0


def test_login_rate_limit(client):
    token = client.get("/api/session").json["csrf"]
    for _ in range(8):
        assert (
            client.post("/api/login", json={"password": "wrong"}, headers={"X-CSRF-Token": token}).status_code
            == 401
        )
    assert (
        client.post("/api/login", json={"password": "wrong"}, headers={"X-CSRF-Token": token}).status_code
        == 429
    )


def test_recovery_idempotent_preserves_edits(app):
    with app.app_context():
        source = ROOT / "data/recovered-inventory.json"
        count = import_recovery(source)
        expected = len(json.loads(source.read_text(encoding="utf8")))
        assert count == expected
        item = db.session.scalar(select(Item).where(Item.status != "archived"))
        item.name = "Reviewed by staff"
        db.session.commit()
        assert import_recovery(source) == 0
        assert db.session.get(Item, item.id).name == "Reviewed by staff"
        assert db.session.scalar(select(func.count()).select_from(ItemHistory)) == expected


def test_backup_restore_checksum_and_database(staff, item, app, tmp_path):
    with app.app_context():
        folder = Path(app.config["UPLOAD_FOLDER"])
        (folder / "kept.webp").write_bytes(b"test photo")
        backup = create_backup(tmp_path / "backups")
        report = verify_backup(backup)
        assert report["verified"] and report["items"] == 1
        destination = restore_backup(backup, tmp_path / "restored")
        assert (destination / "static/uploads/kept.webp").read_bytes() == b"test photo"
        with sqlite3.connect(destination / "instance/ilab.db") as restored:
            assert restored.execute("SELECT name FROM item").fetchone()[0] == item["name"]
        with pytest.raises(ValueError):
            restore_backup(backup, destination)


def test_fresh_migration_matches_models(app):
    with app.app_context():
        db.drop_all()
        upgrade(directory=str(ROOT / "migrations"))
        assert db.session.execute(select(Item)).all() == []
        from alembic.autogenerate import compare_metadata
        from alembic.migration import MigrationContext

        with db.engine.connect() as connection:
            assert compare_metadata(MigrationContext.configure(connection), db.metadata) == []
