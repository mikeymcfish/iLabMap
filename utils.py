from models import Item
from flask import current_app

def list_available_items():
    try:
        items = Item.query.all()
        item_list = [{"id": item.id, "name": item.name, "tags": item.tags, "description": item.description} for item in items]
        return item_list
    except Exception as e:
        if current_app:
            current_app.logger.error(f"Error fetching tools and items: {str(e)}")
        else:
            print(f"Error fetching tools and items: {str(e)}")
        return []

def get_item_location(item_id):
    
    try:
        # Query the database for the item with the given item_id
        item = Item.query.filter_by(id=item_id).first()
        if item:
            return item
        else:
            return None
    except Exception as e:
        if current_app:
            current_app.logger.error(f"Error fetching item with item_id {item_id}: {str(e)}")
        else:
            print(f"Error fetching item with item_id {item_id}: {str(e)}")
        return None