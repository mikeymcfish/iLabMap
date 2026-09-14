import json
from pathlib import Path
from flask import Blueprint, abort, current_app, jsonify, redirect, render_template, request, session
from sqlalchemy import func, or_, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm.exc import StaleDataError
from werkzeug.security import check_password_hash
from app import db
from models import Item, ItemHistory, Map
from security import check_csrf, csrf_token, rate_limit, staff_only
from validation import EDITABLE, numeric, save_image, validate

main_blueprint = Blueprint("main", __name__)


@main_blueprint.before_request
def protect_writes():
    if request.path.startswith("/api/") and request.method not in ("GET", "HEAD", "OPTIONS"):
        check_csrf()


@main_blueprint.route("/")
def index():
    return render_template("index.html")


@main_blueprint.route("/3d")
def three_d():
    return redirect("/?view=3d")


@main_blueprint.get("/api/health")
def health():
    try:
        db.session.execute(select(Item.id).limit(1))
        return jsonify(status="ok", version="2.0.0")
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify(status="uninitialized", error="Run init-db and import-recovery."), 503


@main_blueprint.get("/api/session")
def session_info():
    return jsonify(
        staff=bool(session.get("staff")), csrf=csrf_token(), ai_enabled=bool(current_app.config["AI_ENABLED"])
    )


@main_blueprint.post("/api/login")
def login():
    rate_limit("login", 8)
    data = request.get_json(silent=True)
    password = data.get("password") if isinstance(data, dict) else None
    if not isinstance(password, str) or len(password) > 500:
        abort(400, "Enter your staff password.")
    if not check_password_hash(current_app.config["ADMIN_PASSWORD_HASH"], password):
        abort(401, "Incorrect password.")
    session.clear()
    session.permanent = True
    session["staff"] = True
    return jsonify(staff=True, csrf=csrf_token())


@main_blueprint.post("/api/logout")
def logout():
    session.clear()
    return jsonify(staff=False, csrf=csrf_token())


@main_blueprint.get("/api/maps")
def maps():
    return jsonify([m.to_dict() for m in db.session.scalars(select(Map).order_by(Map.id))])


@main_blueprint.get("/api/maps/<int:map_id>")
def get_map(map_id):
    return jsonify(db.get_or_404(Map, map_id).to_dict())


def filtered_query():
    query = select(Item)
    map_id = request.args.get("map_id", type=int)
    if map_id:
        query = query.where(Item.map_id == map_id)
    status = request.args.get("status", "active")
    if status in ("archived", "all") and not session.get("staff"):
        abort(401, "Staff sign-in is required to view archived recovery entries.")
    if status == "active":
        query = query.where(Item.status != "archived")
    elif status != "all":
        if status not in ("available", "needs_review", "archived"):
            abort(400, "Invalid status filter.")
        query = query.where(Item.status == status)
    text = request.args.get("q", "").strip()[:200]
    if text:
        query = query.where(
            or_(
                *(
                    getattr(Item, key).icontains(text, autoescape=True)
                    for key in ("name", "tags", "zone", "description")
                )
            )
        )
    if request.args.get("stock") == "in":
        query = query.where(Item.quantity > 0)
    elif request.args.get("stock") == "out":
        query = query.where(Item.quantity == 0)
    return query


@main_blueprint.get("/api/items")
@main_blueprint.get("/api/search")
def list_items():
    query = filtered_query()
    total = db.session.scalar(select(func.count()).select_from(query.subquery()))
    page = max(1, request.args.get("page", 1, type=int))
    limit = max(1, min(200, request.args.get("limit", 100, type=int)))
    rows = db.session.scalars(
        query.order_by(func.lower(Item.name), Item.id).offset((page - 1) * limit).limit(limit)
    )
    return jsonify(items=[i.to_dict() for i in rows], total=total, page=page, limit=limit)


@main_blueprint.get("/api/items/<int:item_id>")
def get_item(item_id):
    item = db.get_or_404(Item, item_id)
    if item.status == "archived" and not session.get("staff"):
        abort(401, "Staff sign-in is required.")
    return jsonify(item.to_dict())


def payload():
    if request.is_json:
        data = request.get_json()
    elif "payload" in request.form:
        try:
            data = json.loads(request.form["payload"])
        except ValueError:
            abort(400, "Invalid form data.")
    else:
        data = request.form.to_dict()
    if not isinstance(data, dict):
        abort(400, "Expected an object.")
    return data


def check_revision(item, data):
    if numeric(data.get("revision"), "revision", integer=True) != item.revision:
        abort(409, "This item changed in another session. Reload it before saving.")


def commit_item(item, action, before=None, new_image=None):
    try:
        db.session.flush()
        db.session.add(ItemHistory(item_id=item.id, action=action, snapshot=before or item.to_dict()))
        db.session.commit()
        return item.to_dict()
    except (SQLAlchemyError, StaleDataError) as error:
        db.session.rollback()
        if new_image:
            (Path(current_app.config["UPLOAD_FOLDER"]) / Path(new_image).name).unlink(missing_ok=True)
        if isinstance(error, StaleDataError):
            abort(409, "This item changed in another session. Reload it before saving.")
        current_app.logger.exception("Inventory save failed")
        abort(500, "Unable to save the item. Your changes were not committed.")


@main_blueprint.post("/api/items")
@staff_only
def create_item():
    data = payload()
    values = validate(data)
    image = save_image(request.files.get("image"))
    item = Item(**values, image_path=image)
    db.session.add(item)
    return jsonify(commit_item(item, "created", new_image=image)), 201


@main_blueprint.route("/api/items/<int:item_id>", methods=["PATCH", "PUT"])
@staff_only
def update_item(item_id):
    item = db.get_or_404(Item, item_id)
    data = payload()
    check_revision(item, data)
    values = validate(data, item)
    before = item.to_dict()
    image = save_image(request.files.get("image"))
    for key, value in values.items():
        setattr(item, key, value)
    if image:
        item.image_path = image
    elif data.get("remove_image") is True:
        item.image_path = None
    return jsonify(commit_item(item, "updated", before, image))


@main_blueprint.delete("/api/items/<int:item_id>")
@staff_only
def archive_item(item_id):
    item = db.get_or_404(Item, item_id)
    check_revision(item, payload())
    before = item.to_dict()
    item.status = "archived"
    return jsonify(commit_item(item, "archived", before))


@main_blueprint.get("/api/items/<int:item_id>/history")
@staff_only
def history(item_id):
    db.get_or_404(Item, item_id)
    rows = db.session.scalars(
        select(ItemHistory).where(ItemHistory.item_id == item_id).order_by(ItemHistory.id.desc()).limit(50)
    )
    return jsonify(
        [
            dict(id=h.id, action=h.action, created_at=h.created_at.isoformat(), snapshot=h.snapshot)
            for h in rows
        ]
    )


@main_blueprint.post("/api/items/<int:item_id>/restore")
@staff_only
def restore(item_id):
    item = db.get_or_404(Item, item_id)
    data = payload()
    check_revision(item, data)
    record = db.get_or_404(ItemHistory, numeric(data.get("history_id"), "history_id", integer=True))
    if record.item_id != item.id:
        abort(400, "History entry belongs to a different item.")
    before = item.to_dict()
    values = validate({k: v for k, v in record.snapshot.items() if k in EDITABLE}, item)
    for key, value in values.items():
        setattr(item, key, value)
    item.image_path = record.snapshot.get("image_path")
    return jsonify(commit_item(item, "restored", before))


@main_blueprint.get("/api/export")
@staff_only
def export_items():
    rows = db.session.scalars(select(Item).order_by(Item.id))
    response = jsonify(
        schema_version=2,
        maps=[m.to_dict() for m in db.session.scalars(select(Map))],
        items=[i.to_dict() for i in rows],
    )
    response.headers["Content-Disposition"] = 'attachment; filename="ilab-inventory.json"'
    return response


@main_blueprint.post("/api/chat")
def chat():
    from chat import get_response

    rate_limit("chat", 15)
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or not isinstance(data.get("message"), str):
        abort(400, "Enter a question.")
    message = data["message"].strip()
    if not message or len(message) > 1500:
        abort(400, "Questions must contain 1–1500 characters.")
    cloud = data.get("cloud") is True
    if cloud and not session.get("staff"):
        abort(401, "Staff sign-in is required for the AI guide.")
    return jsonify(get_response(message, data.get("map_id"), cloud, data.get("history", [])))
