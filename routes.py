from flask import Blueprint, request, jsonify, send_from_directory, current_app, render_template
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import or_
from werkzeug.utils import secure_filename
from app import db
from models import Map, Item
import os
import uuid
import datetime

main_blueprint = Blueprint('main', __name__)

@main_blueprint.route('/api/maps', methods=['GET'])
def get_maps():
    try:
        maps = Map.query.all()
        return jsonify([{'id': map.id, 'name': map.name} for map in maps])
    except SQLAlchemyError as e:
        current_app.logger.error(f"Error fetching maps: {str(e)}")
        return jsonify({"error": "An error occurred while fetching maps"}), 500

@main_blueprint.route('/api/maps/<int:map_id>', methods=['GET'])
def get_map(map_id):
    try:
        map = Map.query.get(map_id)
        if map:
            return jsonify({'id': map.id, 'name': map.name, 'svg_path': map.svg_path, 'background_color': map.background_color})
        else:
            return jsonify({"error": "Map not found"}), 404
    except SQLAlchemyError as e:
        current_app.logger.error(f"Error fetching map {map_id}: {str(e)}")
        return jsonify({"error": "An error occurred while fetching the map"}), 500

@main_blueprint.route('/api/items', methods=['GET'])
def get_items():
    try:
        map_id = request.args.get('map_id', type=int)
        if not map_id:
            return jsonify({"error": "map_id is required"}), 400

        items = Item.query.filter_by(map_id=map_id).all()
        current_app.logger.info(f"Fetched {len(items)} items for map_id {map_id}")
        return jsonify([{
            'id': item.id,
            'name': item.name,
            'tags': item.tags,
            'x_coord': item.x_coord,
            'y_coord': item.y_coord,
            'color': item.color,
            'zone': item.zone,
            'quantity': item.quantity,
            'warning': item.warning,
            'description': item.description,
            'link': item.link
        } for item in items])
    except SQLAlchemyError as e:
        current_app.logger.error(f"Error fetching items for map {map_id}: {str(e)}")
        return jsonify({"error": "An error occurred while fetching items"}), 500

@main_blueprint.route('/api/bulk_items', methods=['POST'])
def bulk_items():
    try:
        data = request.json
        map_id = data.get('map_id')
        items_data = data.get('items', [])

        if not map_id:
            return jsonify({"error": "map_id is required"}), 400

        added_count = 0
        for item_data in items_data:
            new_item = Item(
                name=item_data['name'],
                tags=item_data['tags'],
                quantity=item_data['quantity'],
                description=item_data.get('description', ''),
                link=item_data.get('link', ''),
                map_id=map_id,
                x_coord=0,  # Default value, to be updated later
                y_coord=0,  # Default value, to be updated later
                color='red',  # Default value
                zone='',  # Default value
                warning=''  # Default value
            )
            db.session.add(new_item)
            added_count += 1

        db.session.commit()
        current_app.logger.info(f"Added {added_count} items in bulk")
        return jsonify({"message": "Bulk items added successfully", "added_count": added_count}), 201

    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Error adding bulk items: {str(e)}")
        return jsonify({"error": "An error occurred while adding bulk items"}), 500

@main_blueprint.route('/')
def index():
    return render_template('index.html')
