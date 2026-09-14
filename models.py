"""One schema and one serializer for inventory, recovery, and map clients."""

from datetime import datetime, timezone
import hashlib
from pathlib import Path
from flask import current_app
from app import db


def utc_now():
    return datetime.now(timezone.utc)


class Map(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    svg_path = db.Column(db.String(300), nullable=False)
    model_path = db.Column(db.String(300))
    background_color = db.Column(db.String(30), default="#edf1eb", nullable=False)
    width = db.Column(db.Float, nullable=False, default=1000)
    height = db.Column(db.Float, nullable=False, default=1000)
    items = db.relationship("Item", backref="map", lazy=True)

    def to_dict(self):
        return {
            k: getattr(self, k)
            for k in ("id", "name", "svg_path", "model_path", "background_color", "width", "height")
        }


class Item(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, index=True)
    tags = db.Column(db.String(500), nullable=False, default="")
    x_coord = db.Column(db.Float)
    y_coord = db.Column(db.Float)
    x_coord_model = db.Column(db.Float)
    y_coord_model = db.Column(db.Float)
    z_coord_model = db.Column(db.Float)
    map_id = db.Column(db.Integer, db.ForeignKey("map.id"), nullable=False, index=True)
    image_path = db.Column(db.String(300))
    color = db.Column(db.String(30), nullable=False, default="#147d64")
    zone = db.Column(db.String(100), nullable=False, default="")
    quantity = db.Column(db.Integer, nullable=False, default=1)
    warning = db.Column(db.String(255), nullable=False, default="")
    description = db.Column(db.Text, nullable=False, default="")
    link = db.Column(db.String(500), nullable=False, default="")
    status = db.Column(db.String(30), nullable=False, default="available", index=True)
    recovery_key = db.Column(db.String(64), unique=True)
    provenance = db.Column(db.JSON)
    revision = db.Column(db.Integer, nullable=False, default=1)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)
    __table_args__ = (
        db.CheckConstraint("quantity >= 0", name="nonnegative_quantity"),
        db.CheckConstraint("status IN ('available','needs_review','archived')", name="valid_status"),
    )
    __mapper_args__ = {"version_id_col": revision}

    def to_dict(self):
        values = {
            k: getattr(self, k)
            for k in (
                "id",
                "name",
                "tags",
                "x_coord",
                "y_coord",
                "x_coord_model",
                "y_coord_model",
                "z_coord_model",
                "map_id",
                "image_path",
                "color",
                "zone",
                "quantity",
                "warning",
                "description",
                "link",
                "status",
                "revision",
                "provenance",
            )
        }
        values["updated_at"] = self.updated_at.isoformat() if self.updated_at else None
        thumbnail = self.image_path
        if self.image_path and self.image_path.startswith("/static/thumbnails/"):
            name = hashlib.sha256(Path(self.image_path).name.encode()).hexdigest()[:16] + ".webp"
            if (Path(current_app.static_folder) / "optimized" / name).is_file():
                thumbnail = "/static/optimized/" + name
        values["thumbnail_path"] = thumbnail
        return values


class ItemHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey("item.id"), nullable=False, index=True)
    action = db.Column(db.String(30), nullable=False)
    snapshot = db.Column(db.JSON, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)


class Mesh(db.Model):
    """Preserve the unfinished mesh catalog for future per-object annotations."""

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    display_name = db.Column(db.String(200))
    description = db.Column(db.Text)
    map_id = db.Column(db.Integer, db.ForeignKey("map.id"), nullable=False, index=True)
    tags = db.Column(db.String(500))
