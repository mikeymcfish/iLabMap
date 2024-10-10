from app import app, db
from models import Map

def update_map_names():
    with app.app_context():
        ilab_map = Map.query.filter_by(name="Main Floor").first()
        if ilab_map:
            ilab_map.name = "iLab"
            ilab_map.svg_path = "/static/maps/main.JPG"

        closet_map = Map.query.filter_by(name="Second Floor").first()
        if closet_map:
            closet_map.name = "Closet"
            closet_map.svg_path = "/static/maps/closet.svg"

        db.session.commit()
        print("Map names and paths updated successfully.")

if __name__ == "__main__":
    update_map_names()
