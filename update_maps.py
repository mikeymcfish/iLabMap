from app import app, db
from models import Map

def update_maps():
    with app.app_context():
        ilab_map = Map.query.filter_by(name="iLab").first()
        if ilab_map:
            ilab_map.svg_path = "/static/maps/main.svg"
            ilab_map.background_color = "white"

        closet_map = Map.query.filter_by(name="Closet").first()
        if closet_map:
            closet_map.background_color = "white"

        db.session.commit()
        print("Maps updated successfully.")

if __name__ == "__main__":
    update_maps()
