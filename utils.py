from models import Item
from flask import current_app

def list_available_items():
    try:
        items = Item.query.all()
        item_list = [{"id": item.id, "name": item.name, "tags": item.tags, "quantity": item.quantity} for item in items]
        return item_list
    except Exception as e:
        if current_app:
            current_app.logger.error(f"Error fetching tools and items: {str(e)}")
        else:
            print(f"Error fetching tools and items: {str(e)}")
        return []