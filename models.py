# models.py
from app import db

class Map(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    svg_path = db.Column(db.String(200), nullable=False)
    background_color = db.Column(db.String(20), default='white')
    items = db.relationship('Item', backref='map', lazy=True)

class Item(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    tags = db.Column(db.String(200))
    x_coord = db.Column(db.Float, nullable=False)
    y_coord = db.Column(db.Float, nullable=False)
    map_id = db.Column(db.Integer, db.ForeignKey('map.id'), nullable=False)
    image_path = db.Column(db.String(200), nullable=True)
    color = db.Column(db.String(20), nullable=True, default="red")  # New field
    zone = db.Column(db.String(100), nullable=True, default="")      # New field
    quantity = db.Column(db.Integer, nullable=True, default=1)      # New field
    warning = db.Column(db.String(255), nullable=True, default="")   # New field