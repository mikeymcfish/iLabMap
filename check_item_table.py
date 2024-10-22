from app import create_app, db
from sqlalchemy import inspect

def check_item_table():
    app = create_app()
    with app.app_context():
        inspector = inspect(db.engine)
        columns = inspector.get_columns('item')
        print("Columns in the 'item' table:")
        for column in columns:
            print(f"- {column['name']}: {column['type']}")

if __name__ == "__main__":
    check_item_table()
