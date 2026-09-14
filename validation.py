import math
import re
from pathlib import Path
from urllib.parse import urlsplit
from uuid import uuid4
from flask import abort, current_app
from PIL import Image, ImageOps, UnidentifiedImageError
from app import db
from models import Map

TEXT_LIMITS = {
    "name": 100,
    "tags": 500,
    "zone": 100,
    "description": 10000,
    "link": 500,
    "warning": 255,
    "color": 30,
}
COORDS = ("x_coord", "y_coord", "x_coord_model", "y_coord_model", "z_coord_model")
EDITABLE = {*TEXT_LIMITS, *COORDS, "map_id", "quantity", "status"}
WARNINGS = {"bolt", "fire", "glasses", "gloves", "hand", "mask"}


def numeric(value, field, integer=False, nullable=False):
    if value is None or value == "":
        if nullable:
            return None
        abort(400, f"{field} is required.")
    if isinstance(value, bool) or not isinstance(value, (str, int, float)):
        abort(400, f"{field} must be a number.")
    try:
        result = float(value)
        if not math.isfinite(result) or (integer and not result.is_integer()):
            raise ValueError
        if abs(result) > 1e9:
            raise ValueError
        return int(result) if integer else result
    except (ValueError, TypeError, OverflowError):
        abort(400, f"{field} must be a valid {'whole ' if integer else ''}number.")


def validate(data, item=None):
    if not isinstance(data, dict):
        abort(400, "Expected an object.")
    unknown = set(data) - EDITABLE - {"revision", "remove_image"}
    if unknown:
        abort(400, "Unknown fields: " + ", ".join(sorted(unknown)))
    values = (
        {key: getattr(item, key) for key in EDITABLE}
        if item
        else {
            **{k: "" for k in TEXT_LIMITS},
            **dict.fromkeys(COORDS),
            "map_id": 1,
            "quantity": 1,
            "status": "available",
            "color": "#147d64",
        }
    )
    for key in TEXT_LIMITS:
        if key in data:
            if not isinstance(data[key], str):
                abort(400, f"{key} must be text.")
            value = data[key].strip()
            if len(value) > TEXT_LIMITS[key]:
                abort(400, f"{key} is too long.")
            values[key] = value
    if not values["name"]:
        abort(400, "Enter an item name.")
    for key in COORDS:
        if key in data:
            values[key] = numeric(data[key], key, nullable=True)
    for key in ("map_id", "quantity"):
        if key in data:
            values[key] = numeric(data[key], key, integer=True)
    if values["quantity"] < 0:
        abort(400, "Quantity cannot be negative.")
    map_record = db.session.get(Map, values["map_id"])
    if not map_record:
        abort(400, "Choose an existing map.")
    for group in (("x_coord", "y_coord"), ("x_coord_model", "y_coord_model", "z_coord_model")):
        present = [values[k] is not None for k in group]
        if any(present) and not all(present):
            abort(400, "Supply all coordinates for a location, or clear all of them.")
    if values["x_coord"] is not None:
        if not (0 <= values["x_coord"] <= map_record.width and 0 <= values["y_coord"] <= map_record.height):
            abort(400, "Floor-plan location must be inside the map.")
    if "status" in data:
        values["status"] = data["status"]
    if values["status"] not in ("available", "needs_review", "archived"):
        abort(400, "Choose a valid item status.")
    if values["link"]:
        try:
            url = urlsplit(values["link"])
            if url.scheme not in ("https", "http") or not url.hostname or url.username or url.password:
                raise ValueError
        except ValueError:
            abort(400, "Links must be an http or https address without credentials.")
    warnings = {s.strip() for s in values["warning"].split(",") if s.strip()}
    if not warnings <= WARNINGS:
        abort(400, "Choose one of the supported safety warnings.")
    values["warning"] = ",".join(sorted(warnings))
    if not re.fullmatch(r"#[0-9a-fA-F]{6}|[a-zA-Z]{1,20}", values["color"]):
        abort(400, "Choose a valid marker color.")
    return values


def save_image(file):
    if not file or not file.filename:
        return None
    destination = Path(current_app.config["UPLOAD_FOLDER"]) / f"{uuid4().hex}.webp"
    try:
        with Image.open(file.stream) as image:
            if image.format not in {"JPEG", "PNG", "WEBP", "GIF"} or image.width * image.height > 20_000_000:
                abort(400, "Use a PNG, JPEG, WebP, or GIF image under 20 megapixels.")
            image.load()
            clean = ImageOps.exif_transpose(image).convert("RGB")
            clean.thumbnail((1200, 1200))
            clean.save(destination, "WEBP", quality=85)
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        destination.unlink(missing_ok=True)
        abort(400, "The uploaded file is not a valid image.")
    return f"/static/uploads/{destination.name}"
