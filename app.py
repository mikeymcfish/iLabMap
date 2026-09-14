"""Application factory. Imports never start servers or schedulers."""

import os
import secrets
import sqlite3
from datetime import timedelta
from pathlib import Path
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from dotenv import load_dotenv
from sqlalchemy import event
from sqlalchemy.engine import Engine
from werkzeug.exceptions import HTTPException
from werkzeug.security import generate_password_hash

db = SQLAlchemy()
migrate = Migrate()
ROOT = Path(__file__).resolve().parent


@event.listens_for(Engine, "connect")
def sqlite_pragmas(connection, _):
    if isinstance(connection, sqlite3.Connection):
        cursor = connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()


def persisted_secret(path):
    if not path.exists():
        path.write_text(secrets.token_urlsafe(36), encoding="utf8")
    return path.read_text(encoding="utf8").strip()


def create_app(config=None):
    load_dotenv(ROOT / ".env")
    instance = Path((config or {}).get("INSTANCE_PATH", ROOT / "instance")).resolve()
    instance.mkdir(parents=True, exist_ok=True)
    app = Flask(__name__, instance_path=str(instance))
    app.config.from_mapping(
        SQLALCHEMY_DATABASE_URI=os.getenv("DATABASE_URL", "sqlite:///ilab.db"),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        SQLALCHEMY_ENGINE_OPTIONS={"pool_pre_ping": True},
        MAX_CONTENT_LENGTH=8 * 1024 * 1024,
        UPLOAD_FOLDER=str(ROOT / "static" / "uploads"),
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_NAME="ilab_session",
        SESSION_COOKIE_SAMESITE="Strict",
        SESSION_COOKIE_SECURE=os.getenv("ILAB_SECURE_COOKIES", "false").lower() == "true",
        PERMANENT_SESSION_LIFETIME=timedelta(hours=8),
        AI_ENABLED=os.getenv("ILAB_AI_ENABLED", "false").lower() == "true",
        OPENAI_MODEL=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
    )
    app.config.update(config or {})
    if not app.config.get("SECRET_KEY"):
        app.config["SECRET_KEY"] = persisted_secret(instance / "secret.key")
    if not app.config.get("ADMIN_PASSWORD_HASH"):
        password = os.getenv("ILAB_ADMIN_PASSWORD") or persisted_secret(instance / "admin-password.txt")
        app.config["ADMIN_PASSWORD_HASH"] = generate_password_hash(password)
    Path(app.config["UPLOAD_FOLDER"]).mkdir(parents=True, exist_ok=True)
    db.init_app(app)
    migrate.init_app(app, db, compare_type=True, render_as_batch=True)
    from routes import main_blueprint
    from commands import register_commands

    app.register_blueprint(main_blueprint)
    register_commands(app)

    @app.errorhandler(HTTPException)
    def http_error(error):
        if error.code == 413:
            return jsonify(error="Images must be smaller than 8 MB."), 413
        return jsonify(error=error.description), error.code

    @app.after_request
    def headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "same-origin"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; "
            "base-uri 'self'; frame-ancestors 'none'; form-action 'self'"
        )
        if request.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        return response

    return app
