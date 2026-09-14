"""Compatibility entry point for safe, idempotent setup."""
from app import create_app
from commands import seed_maps
from flask_migrate import upgrade

def init_db():
    with create_app().app_context():
        upgrade()
        seed_maps()

if __name__ == "__main__":
    init_db()
