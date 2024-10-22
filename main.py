from app import create_app, db
from models import Item, Map
from provision_maps import provision_maps
from backup_db import start_scheduler

# Start the backup scheduler
start_scheduler()

app = create_app()

# Diagnostic function
def diagnose_database():
    with app.app_context():
        # Check if the z_coord column exists in the Item table
        inspector = db.inspect(db.engine)
        columns = inspector.get_columns('item')
        z_coord_exists = any(column['name'] == 'z_coord' for column in columns)
        
        print(f"z_coord column exists: {z_coord_exists}")
        
        # Check if there are any items in the database
        item_count = Item.query.count()
        print(f"Number of items in the database: {item_count}")
        
        # If there are items, check if they have z_coord values
        if item_count > 0:
            items_with_z_coord = Item.query.filter(Item.z_coord != None).count()
            print(f"Number of items with z_coord: {items_with_z_coord}")
        
        # Check if there are any maps in the database
        map_count = Map.query.count()
        print(f"Number of maps in the database: {map_count}")

# Run diagnostic function
diagnose_database()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
