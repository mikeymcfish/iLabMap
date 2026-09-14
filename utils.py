"""Compatibility helpers using the shared item serializer."""

from sqlalchemy import select
from app import db
from models import Item


def list_available_items():
    return [i.to_dict() for i in db.session.scalars(select(Item).where(Item.status != "archived"))]


def get_item_location(item_id):
    return db.session.get(Item, item_id)
