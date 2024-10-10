from app import app, db
from models import Map

def provision_maps():
    with app.app_context():
        # Check if maps already exist
        if Map.query.count() == 0:
            # Add default maps
            ilab_map = Map(name="iLab", svg_path="/static/maps/main.svg", background_color="white")
            closet_map = Map(name="Closet", svg_path="/static/maps/closet.svg", background_color="white")
            
            db.session.add(ilab_map)
            db.session.add(closet_map)
            db.session.commit()
            print("Default maps provisioned successfully.")
        else:
            print("Maps already exist in the database. Skipping provisioning.")

if __name__ == "__main__":
    provision_maps()
