import os
from flask import Blueprint, request, jsonify, send_from_directory, current_app, render_template
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import or_
from werkzeug.utils import secure_filename
from app import db
from models import Map, Item
import uuid
import datetime

main_blueprint = Blueprint('main', __name__)

def generate_unique_filename(filename):
    """Generate a unique filename using timestamp and UUID."""
    _, file_extension = os.path.splitext(filename)
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    random_string = str(uuid.uuid4())[:8]
    return f"{timestamp}_{random_string}{file_extension}"

def file_exists(file_path):
    """Check if a file exists in the static folder."""
    # Handle paths with or without the '/static/' prefix
    if file_path.startswith('/static/'):
        relative_path = file_path[8:]  # Remove '/static/' prefix
    else:
        relative_path = file_path

    full_path = os.path.join(current_app.static_folder, relative_path)
    return os.path.exists(full_path)

@main_blueprint.before_request
def log_request_info():
    current_app.logger.debug('Request Method: %s, URL: %s', request.method, request.url)

@main_blueprint.route('/')
def index():
    return render_template('index.html')

@main_blueprint.route('/api/maps', methods=['GET'])
def get_maps():
    maps = Map.query.all()
    return jsonify([{'id': m.id, 'name': m.name, 'svg_path': m.svg_path} for m in maps])

@main_blueprint.route('/api/maps/<int:map_id>', methods=['GET'])
def get_map(map_id):
    map_obj = Map.query.get_or_404(map_id)
    return jsonify({'id': map_obj.id, 'name': map_obj.name, 'svg_path': map_obj.svg_path, 'background_color': map_obj.background_color})

@main_blueprint.route('/api/items', methods=['GET'])
def get_items():
    map_id = request.args.get('map_id', type=int)
    if map_id:
        items = Item.query.filter_by(map_id=map_id).all()
    else:
        items = Item.query.all()
    return jsonify([item.to_dict() for item in items])

@main_blueprint.route('/api/items', methods=['POST'])
def create_item():
    data = request.form.to_dict()
    current_app.logger.debug(f"Received data: {data}")
    
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400
    
    file = request.files['image']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file:
        filename = generate_unique_filename(secure_filename(file.filename))
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        full_path = os.path.join(current_app.static_folder, file_path)
        
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        file.save(full_path)
        
        data['image_path'] = f'/static/{file_path}'
    
    try:
        new_item = Item(
            name=data['name'],
            tags=data['tags'],
            x_coord=float(data['x_coord']),
            y_coord=float(data['y_coord']),
            map_id=int(data['map_id']),
            image_path=data.get('image_path'),
            color=data.get('color', 'red'),
            zone=data.get('zone', ''),
            quantity=int(data.get('quantity', 1)),
            warning=data.get('warning', '')
        )
        db.session.add(new_item)
        db.session.commit()
        return jsonify(new_item.to_dict()), 201
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        current_app.logger.error(f"Unexpected error: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred'}), 500

@main_blueprint.route('/api/items/<int:item_id>', methods=['PUT'])
def update_item(item_id):
    item = Item.query.get_or_404(item_id)
    data = request.form.to_dict()
    
    if 'image' in request.files:
        file = request.files['image']
        if file.filename != '':
            filename = generate_unique_filename(secure_filename(file.filename))
            file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
            full_path = os.path.join(current_app.static_folder, file_path)
            
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            file.save(full_path)
            
            # Delete the old image file if it exists
            if item.image_path and file_exists(item.image_path):
                old_file_path = os.path.join(current_app.static_folder, item.image_path.lstrip('/static/'))
                os.remove(old_file_path)
            
            data['image_path'] = f'/static/{file_path}'
    
    for key, value in data.items():
        if hasattr(item, key):
            setattr(item, key, value)
    
    try:
        db.session.commit()
        return jsonify(item.to_dict()), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500

@main_blueprint.route('/api/items/<int:item_id>', methods=['DELETE'])
def delete_item(item_id):
    item = Item.query.get_or_404(item_id)
    try:
        # Delete the image file if it exists
        if item.image_path and file_exists(item.image_path):
            file_path = os.path.join(current_app.static_folder, item.image_path.lstrip('/static/'))
            os.remove(file_path)
        
        db.session.delete(item)
        db.session.commit()
        return jsonify({'message': 'Item deleted successfully'}), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500

@main_blueprint.route('/api/search', methods=['GET'])
def search_items():
    query = request.args.get('q', '')
    search_type = request.args.get('type', 'all')
    map_id = request.args.get('map_id', type=int)
    
    if map_id:
        base_query = Item.query.filter_by(map_id=map_id)
    else:
        base_query = Item.query
    
    if search_type == 'name':
        results = base_query.filter(Item.name.ilike(f'%{query}%')).all()
    elif search_type == 'tags':
        results = base_query.filter(Item.tags.ilike(f'%{query}%')).all()
    else:
        results = base_query.filter(or_(Item.name.ilike(f'%{query}%'), Item.tags.ilike(f'%{query}%'))).all()
    
    return jsonify([item.to_dict() for item in results])

@main_blueprint.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory(current_app.static_folder, filename)
