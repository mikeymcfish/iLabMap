import os
from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)
migrate = Migrate()
app = Flask(__name__)

app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "a secret key"
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
db.init_app(app)
migrate.init_app(app, db)

with app.app_context():
    import models

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/maps', methods=['GET'])
def get_maps():
    maps = models.Map.query.all()
    return jsonify([{"id": map.id, "name": map.name} for map in maps])

@app.route('/api/maps/<int:map_id>', methods=['GET'])
def get_map(map_id):
    map = models.Map.query.get_or_404(map_id)
    return jsonify({"id": map.id, "name": map.name, "svg_path": map.svg_path})

@app.route('/api/items', methods=['GET', 'POST'])
def items():
    if request.method == 'POST':
        data = request.json
        required_fields = ['name', 'tags', 'x_coord', 'y_coord', 'map_id']
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            return jsonify({"success": False, "error": f"Missing required fields: {', '.join(missing_fields)}"}), 400
        
        try:
            new_item = models.Item(
                name=data['name'],
                tags=data['tags'],
                x_coord=data['x_coord'],
                y_coord=data['y_coord'],
                map_id=data['map_id']
            )
            db.session.add(new_item)
            db.session.commit()
            return jsonify({"success": True, "id": new_item.id}), 201
        except Exception as e:
            db.session.rollback()
            app.logger.error(f"Error adding item: {str(e)}")
            return jsonify({"success": False, "error": "An error occurred while adding the item. Please try again."}), 500
    else:
        try:
            map_id = request.args.get('map_id')
            if not map_id:
                return jsonify({"success": False, "error": "map_id is required"}), 400
            
            items = models.Item.query.filter_by(map_id=map_id).all()
            return jsonify([{
                "id": item.id,
                "name": item.name,
                "tags": item.tags,
                "x_coord": item.x_coord,
                "y_coord": item.y_coord,
                "map_id": item.map_id
            } for item in items])
        except Exception as e:
            app.logger.error(f"Error fetching items: {str(e)}")
            return jsonify({"success": False, "error": "An error occurred while fetching items. Please try again."}), 500

@app.route('/api/search')
def search():
    query = request.args.get('q', '')
    map_id = request.args.get('map_id')
    items = models.Item.query.filter(
        (models.Item.name.ilike(f'%{query}%') | models.Item.tags.ilike(f'%{query}%')) &
        (models.Item.map_id == map_id)
    ).all()
    return jsonify([{
        "id": item.id,
        "name": item.name,
        "tags": item.tags,
        "x_coord": item.x_coord,
        "y_coord": item.y_coord,
        "map_id": item.map_id
    } for item in items])

@app.route('/static/img/<path:filename>')
def serve_static(filename):
    return send_from_directory(app.static_folder + '/img', filename)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
