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
    color = db.Column(db.String(20), nullable=True, default="red")
    zone = db.Column(db.String(100), nullable=True, default="")
    quantity = db.Column(db.Integer, nullable=True, default=1)
    warning = db.Column(db.String(255), nullable=True, default="")
    description = db.Column(db.Text, nullable=True)
    link = db.Column(db.String(500), nullable=True)
    x_coord_model = db.Column(db.Float, nullable=True, default=0.0)
    y_coord_model = db.Column(db.Float, nullable=True, default=0.0)
    z_coord_model = db.Column(db.Float, nullable=True, default=0.0)

def to_dict(self):
    return {
        'id': self.id,
        'name': self.name,
        'tags': self.tags,
        'x_coord_model': self.x_coord_model,
        'y_coord_model': self.y_coord_model,
        'z_coord_model': self.z_coord_model,
        'image_path': self.image_path,
        'color': self.color,
        'zone': self.zone,
        'quantity': self.quantity,
        'warning': self.warning,
        'map_id': self.map_id
    }