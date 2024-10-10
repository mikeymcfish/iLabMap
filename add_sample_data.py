from app import app, db
from models import Map

def add_sample_maps():
    with app.app_context():
        # Clear existing maps
        Map.query.delete()
        
        # Add sample maps
        map1 = Map(name="Main Floor", svg_path="/static/img/makerspace_map_main.svg")
        map2 = Map(name="Second Floor", svg_path="/static/img/makerspace_map_second.svg")
        
        db.session.add(map1)
        db.session.add(map2)
        db.session.commit()
        
        print("Sample maps added successfully.")

if __name__ == "__main__":
    add_sample_maps()
