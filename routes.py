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
import random

main_blueprint = Blueprint('main', __name__)

# Existing code...

@main_blueprint.route('/api/bulk_items', methods=['POST'])
def add_bulk_items():
    try:
        data = request.json
        map_id = data.get('map_id')
        items = data.get('items')

        if not map_id or not items:
            return jsonify({"error": "Missing map_id or items"}), 400

        added_count = 0
        for item in items:
            new_item = Item(
                name=item['name'],
                tags=item['tags'],
                quantity=item['quantity'],
                description=item['description'],
                link=item['link'],
                x_coord=random.uniform(100, 400),  # Random position, adjust as needed
                y_coord=random.uniform(100, 400),  # Random position, adjust as needed
                map_id=map_id,
                color='red',  # Default color
                zone='',  # Default zone
                warning=''  # Default warning
            )
            db.session.add(new_item)
            added_count += 1

        db.session.commit()
        return jsonify({"message": "Bulk items added successfully", "added_count": added_count}), 201
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Error adding bulk items: {str(e)}")
        return jsonify({"error": "An error occurred while adding bulk items"}), 500

# Existing code...
