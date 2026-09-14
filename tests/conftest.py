import pytest
from werkzeug.security import generate_password_hash
from app import create_app, db
from models import Map


@pytest.fixture
def app(tmp_path):
    app = create_app(
        {
            "TESTING": True,
            "INSTANCE_PATH": str(tmp_path / "instance"),
            "SQLALCHEMY_DATABASE_URI": "sqlite:///" + (tmp_path / "test.db").as_posix(),
            "UPLOAD_FOLDER": str(tmp_path / "static/uploads"),
            "BACKUP_ASSET_ROOT": str(tmp_path / "static"),
            "SECRET_KEY": "test-only-session-secret-32-characters",
            "ADMIN_PASSWORD_HASH": generate_password_hash("test-only-password"),
            "AI_ENABLED": False,
        }
    )
    with app.app_context():
        db.create_all()
        db.session.add_all(
            [
                Map(id=1, name="iLab", svg_path="/static/maps/main.svg", width=864, height=864),
                Map(id=2, name="Closet", svg_path="/static/maps/closet.svg", width=1312.74, height=864),
            ]
        )
        db.session.commit()
    yield app
    with app.app_context():
        db.session.remove()
        db.engine.dispose()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def staff(client):
    token = client.get("/api/session").json["csrf"]
    result = client.post(
        "/api/login", json={"password": "test-only-password"}, headers={"X-CSRF-Token": token}
    )
    assert result.status_code == 200
    client.environ_base["HTTP_X_CSRF_TOKEN"] = result.json["csrf"]
    return client


@pytest.fixture
def item(staff):
    response = staff.post(
        "/api/items",
        json={
            "name": "Soldering iron",
            "tags": "electronics",
            "map_id": 1,
            "quantity": 2,
            "x_coord": 100,
            "y_coord": 200,
            "x_coord_model": 0,
            "y_coord_model": 1,
            "z_coord_model": 2,
            "zone": "Cabinet A",
            "description": "Temperature-controlled",
            "link": "https://example.com/manual",
            "warning": "hand,glasses",
        },
    )
    assert response.status_code == 201, response.json
    return response.json
