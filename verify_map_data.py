from sqlalchemy import select
from app import create_app, db
from models import Map

if __name__ == "__main__":
    with create_app().app_context():
        for record in db.session.scalars(select(Map).order_by(Map.id)):
            print(record.to_dict())
