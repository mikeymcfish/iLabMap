from flask import Blueprint, request, jsonify, send_from_directory, current_app, render_template
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import or_
from werkzeug.utils import secure_filename
from app import db
from models import Map, Item
import os
import uuid
import datetime
import openai
import logging
from typing import Optional
from chat import system_prompt, get_ai_response
from utils import list_available_items

main_blueprint = Blueprint('main', __name__)

@main_blueprint.route('/api/itemsList', methods=['GET'])
def api_list_available_items():
    items = list_available_items()
    return jsonify(items), 200

def generate_unique_filename(filename: Optional[str]) -> str:
    if filename is None:
        filename = "unnamed_file"
    _, file_extension = os.path.splitext(filename)
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    random_string = str(uuid.uuid4())[:8]
    return f"{timestamp}_{random_string}{file_extension}"

@main_blueprint.before_request
def log_request_info():
    current_app.logger.debug('Request Method: %s, URL: %s', request.method, request.url)
    
@main_blueprint.route('/')
def index():
    try:
        items = Item.query.all()
        return render_template('index.html', items=items)
    except SQLAlchemyError as e:
        current_app.logger.error(
            f"Error fetching items for index page: {str(e)}")
        return f"An error occurred while fetching items. : {str(e)}", 500

@main_blueprint.route('/3d')
def threeDee():
    return render_template('3d.html')

@main_blueprint.route('/save_marker', methods=['POST'])
def save_marker():
    data = request.json
    markers.append(data)  # Save marker coordinates
    return jsonify(data)

@main_blueprint.route('/get_markers')
def get_markers():
    return jsonify(markers=markers)

@main_blueprint.route('/api/items/<int:item_id>', methods=['PUT'])
def update_item(item_id):
    item = Item.query.get_or_404(item_id)
    
    name = request.form.get('name')
    tags = request.form.get('tags')
    color = request.form.get('color')
    zone = request.form.get('zone')
    quantity = request.form.get('quantity')
    warning = request.form.get('warning')
    map_id = request.form.get('map_id')
    x_coord = request.form.get('x_coord')
    y_coord = request.form.get('y_coord')
    description = request.form.get('description')
    link = request.form.get('link')

    if name:
        item.name = name
    if tags:
        item.tags = tags
    if color:
        item.color = color
    if zone:
        item.zone = zone
    if quantity:
        item.quantity = int(quantity)
    if warning is not None:
        item.warning = warning
    if map_id:
        item.map_id = int(map_id)
    if x_coord:
        item.x_coord = float(x_coord)
    if y_coord:
        item.y_coord = float(y_coord)
    if description:
        item.description = description
    if link:
        item.link = link

    if 'image' in request.files:
        file = request.files['image']
        if file and allowed_file(file.filename or ''):
            filename = generate_unique_filename(secure_filename(file.filename or ''))
            file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            item.image_path = f'/static/thumbnails/{filename}'

    try:
        db.session.commit()
        return jsonify({'message': 'Item updated successfully'}), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating item (ID: {item_id}): {str(e)}")
        return jsonify({"error": "An error occurred while updating the item"}), 500

@main_blueprint.route('/api/items/<int:item_id>', methods=['GET'])
def get_item(item_id):
    try:
        current_app.logger.info(f"Fetching item with ID: {item_id}")
        item = Item.query.get_or_404(item_id)
        image_path = item.image_path
        return jsonify({
            "id": item.id,
            "name": item.name,
            "tags": item.tags,
            "x_coord": item.x_coord,
            "y_coord": item.y_coord,
            "map_id": item.map_id,
            "image_path": image_path,
            "color": item.color,
            "quantity": item.quantity,
            "warning": item.warning,
            "description": item.description,
            "link": item.link
        }), 200
    except SQLAlchemyError as e:
        current_app.logger.error(
            f"Error retrieving item (ID: {item_id}): {str(e)}")
        return jsonify(
            {"error": "An error occurred while retrieving the item"}), 500

@main_blueprint.route('/api/maps', methods=['GET'])
def get_maps():
    try:
        current_app.logger.info("Fetching all maps")
        maps = Map.query.all()
        return jsonify([{
            "id": map.id,
            "name": map.name
        } for map in maps])
    except SQLAlchemyError as e:
        current_app.logger.error(f"Error fetching maps: {str(e)}")
        return jsonify({"error": "An error occurred while fetching maps"}), 500

@main_blueprint.route('/api/maps/<int:map_id>', methods=['GET'])
def get_map(map_id):
    try:
        current_app.logger.info(f"Fetching map with ID: {map_id}")
        map = Map.query.get_or_404(map_id)
        return jsonify({
            "id": map.id,
            "name": map.name,
            "svg_path": map.svg_path
        })
    except SQLAlchemyError as e:
        current_app.logger.error(
            f"Error fetching map (ID: {map_id}): {str(e)}")
        return jsonify({"error":
                        "An error occurred while fetching the map"}), 500

@main_blueprint.route('/api/items', methods=['GET', 'POST'])
def items():
    if request.method == 'POST':
        data = request.form
        image_file = request.files.get('image')
        current_app.logger.info(f"Received POST data: {data}")

        required_fields = ['name', 'tags', 'x_coord', 'y_coord', 'map_id']
        missing_fields = [
            field for field in required_fields if field not in data
        ]
        if missing_fields:
            current_app.logger.warning(
                f"Missing required fields: {missing_fields}")
            return jsonify({
                "error":
                f"Missing required fields: {', '.join(missing_fields)}"
            }), 400

        image_path = None
        if image_file:
            filename = generate_unique_filename(secure_filename(image_file.filename or ''))
            image_path = os.path.join(current_app.config['UPLOAD_FOLDER'],
                                      filename)
            current_app.logger.info(f"Saving image to: {image_path}")
            image_file.save(image_path)
            image_path = f'/static/thumbnails/{filename}'

        try:
            new_item = Item()
            new_item.name = data['name']
            new_item.tags = data['tags']
            new_item.color = data['color']
            new_item.zone = data['zone']
            new_item.quantity = int(data['quantity'])
            new_item.warning = data['warning']
            new_item.x_coord = float(data['x_coord'])
            new_item.y_coord = float(data['y_coord'])
            new_item.map_id = int(data['map_id'])
            new_item.image_path = image_path
            new_item.description = data.get('description', '')
            new_item.link = data.get('link', '')

            db.session.add(new_item)
            db.session.commit()
            current_app.logger.info(f"New item added with ID: {new_item.id}")
            return jsonify({"id": new_item.id}), 201
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Error adding item: {str(e)}")
            return jsonify(
                {"error": "An error occurred while adding the item"}), 500
    elif request.method == 'GET':
        try:
            map_id = request.args.get('map_id', type=int)
            current_app.logger.info(f"Fetching items for map ID: {map_id}")
            if map_id is None:
                current_app.logger.warning("Missing map_id in request")
                return jsonify({"error": "map_id is required"}), 400

            items = Item.query.filter_by(map_id=map_id).all()
            return jsonify([
                {
                    "id": item.id,
                    "name": item.name,
                    "tags": item.tags,
                    "zone": item.zone,
                    "color": item.color,
                    "quantity": item.quantity,
                    "warning": item.warning,
                    "x_coord": item.x_coord,
                    "y_coord": item.y_coord,
                    "map_id": item.map_id,
                    "image_path": item.image_path,
                    "description": item.description,
                    "link": item.link
                } for item in items
            ])
        except SQLAlchemyError as e:
            current_app.logger.error(
                f"Error fetching items for map ID {map_id}: {str(e)}")
            return jsonify({"error":
                            "An error occurred while fetching items"}), 500

@main_blueprint.route('/api/items/<int:item_id>', methods=['DELETE'])
def delete_item(item_id):
    try:
        current_app.logger.info(
            f"Attempting to delete item with ID: {item_id}")
        item = Item.query.get(item_id)
        if item is None:
            current_app.logger.warning(
                f"Attempt to delete non-existent item with id: {item_id}")
            return jsonify({"error": "Item not found"}), 404
        db.session.delete(item)
        db.session.commit()
        current_app.logger.info(f"Item with id {item_id} deleted successfully")
        return jsonify({"message": "Item deleted successfully"}), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(
            f"Error deleting item (ID: {item_id}): {str(e)}")
        return jsonify({"error":
                        "An error occurred while deleting the item"}), 500

@main_blueprint.route('/api/search')
def search():
    try:
        query = request.args.get('q', '')
        search_type = request.args.get('type', 'all')
        map_id = request.args.get('map_id')

        current_app.logger.info(
            f"Search query: {query}, type: {search_type}, map_id: {map_id}")

        if not map_id:
            current_app.logger.warning("Missing map_id in search request")
            return jsonify({"error": "map_id is required"}), 400

        items_query = Item.query.filter(Item.map_id == map_id)

        if search_type == 'name':
            items_query = items_query.filter(Item.name.ilike(f'%{query}%'))
        elif search_type == 'tags':
            items_query = items_query.filter(Item.tags.ilike(f'%{query}%'))
        else:  # 'all'
            items_query = items_query.filter(
                or_(Item.name.ilike(f'%{query}%'),
                    Item.tags.ilike(f'%{query}%')))

        items = items_query.all()
        current_app.logger.info(
            f"Found {len(items)} items matching search criteria")
        return jsonify([
            {
                "id": item.id,
                "name": item.name,
                "tags": item.tags,
                "x_coord": item.x_coord,
                "y_coord": item.y_coord,
                "map_id": item.map_id,
                "image_path": item.image_path,
                "description": item.description,
                "link": item.link,
                "quantity": item.quantity,
                "warning": item.warning
            } for item in items
        ])
    except SQLAlchemyError as e:
        current_app.logger.error(f"Error searching items: {str(e)}")
        return jsonify(
            {"error": "An error occurred while searching for items"}), 500

@main_blueprint.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory('static', filename)
    
@main_blueprint.route('/static/maps/<path:filename>')
def serve_static(filename):
    file_path = os.path.join(current_app.static_folder, 'maps', filename)
    current_app.logger.info(f"Attempting to serve static file: {file_path}")
    if not os.path.exists(file_path):
        current_app.logger.warning(
            f"Attempt to access non-existent file: {file_path}")
        return jsonify({"error": "File not found"}), 404
    return send_from_directory(os.path.join(current_app.static_folder, 'maps'),
                               filename)

def allowed_file(filename):
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webm'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@main_blueprint.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_message = data.get('message') if data else None
        
        if not user_message:
            current_app.logger.error("No message provided in the request")
            return jsonify({"error": "No message provided"}), 400

        current_app.logger.info(f"Sending message to AI: {user_message}")

        ai_message = get_ai_response(user_message)
        current_app.logger.info(f"Received response from AI: {ai_message}")
        return jsonify({"message": ai_message})

    except Exception as e:
        current_app.logger.error(f"Unexpected error in chat API: {str(e)}")
        return jsonify({"error": "An unexpected error occurred while processing your request"}), 500