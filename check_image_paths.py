import os
from app import create_app, db
from models import Item

def check_image_paths():
    app = create_app()
    with app.app_context():
        items = Item.query.all()
        for item in items:
            print(f"Item ID: {item.id}, Name: {item.name}, Image Path: {item.image_path}")
            
            if item.image_path:
                full_path = os.path.join(app.static_folder, item.image_path.lstrip('/'))
                if os.path.exists(full_path):
                    print(f"  File exists: {full_path}")
                else:
                    print(f"  File does not exist: {full_path}")
            else:
                print("  No image path specified")

if __name__ == "__main__":
    check_image_paths()
