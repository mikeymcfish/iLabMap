from app import app, db
from models import Map

def verify_map_data():
    with app.app_context():
        maps = Map.query.all()
        for map in maps:
            print(f"Map ID: {map.id}")
            print(f"Name: {map.name}")
            print(f"SVG Path: {map.svg_path}")
            print("---")

if __name__ == "__main__":
    verify_map_data()
