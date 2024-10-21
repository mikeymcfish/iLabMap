import csv
import os
from sqlalchemy import create_engine, exc
from sqlalchemy.orm import sessionmaker
from models import Item, Map
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Database connection
DATABASE_URL = os.environ.get('DATABASE_URL')
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

def import_items_from_csv(file_path):
    session = Session()
    try:
        with open(file_path, 'r') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                # Check if item already exists
                existing_item = session.query(Item).filter_by(name=row['name'], map_id=row['map_id']).first()
                if existing_item:
                    logging.info(f"Skipping duplicate item: {row['name']} (Map ID: {row['map_id']})")
                    continue

                # Create new item
                new_item = Item(
                    name=row['name'],
                    tags=row['tags'],
                    x_coord=float(row['x_coord']),
                    y_coord=float(row['y_coord']),
                    z_coord=float(row.get('z_coord', 0)),  # Added z_coord with default value 0
                    map_id=int(row['map_id']),
                    color=row.get('color', 'red'),
                    zone=row.get('zone', ''),
                    quantity=int(row.get('quantity', 1)),
                    warning=row.get('warning', ''),
                    description=row.get('description', ''),
                    link=row.get('link', '')
                )
                session.add(new_item)
                logging.info(f"Added new item: {new_item.name}")

        session.commit()
        logging.info("Import completed successfully")
    except exc.SQLAlchemyError as e:
        session.rollback()
        logging.error(f"Database error: {str(e)}")
    except Exception as e:
        session.rollback()
        logging.error(f"Error importing items: {str(e)}")
    finally:
        session.close()

if __name__ == "__main__":
    csv_file_path = "items.csv"  # Update this with the actual CSV file path
    import_items_from_csv(csv_file_path)
