from sqlalchemy import inspect
from app import create_app, db

if __name__ == "__main__":
    with create_app().app_context():
        for column in inspect(db.engine).get_columns("item"):
            print(column["name"], column["type"])
