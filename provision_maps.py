"""Seed missing spaces without deleting inventory."""
from app import create_app
from commands import seed_maps

def provision_maps():
    with create_app().app_context():
        seed_maps()

if __name__ == "__main__":
    provision_maps()
