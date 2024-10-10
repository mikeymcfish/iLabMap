import os
from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)
app = Flask(__name__)

app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "a secret key"
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
db.init_app(app)

with app.app_context():
    import models
    db.create_all()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/items', methods=['GET', 'POST'])
def items():
    if request.method == 'POST':
        data = request.json
        new_item = models.Item(
            name=data['name'],
            tags=data['tags'],
            x_coord=data['x_coord'],
            y_coord=data['y_coord']
        )
        db.session.add(new_item)
        db.session.commit()
        return jsonify({"success": True, "id": new_item.id}), 201
    else:
        items = models.Item.query.all()
        return jsonify([{
            "id": item.id,
            "name": item.name,
            "tags": item.tags,
            "x_coord": item.x_coord,
            "y_coord": item.y_coord
        } for item in items])

@app.route('/api/search')
def search():
    query = request.args.get('q', '')
    items = models.Item.query.filter(
        (models.Item.name.ilike(f'%{query}%')) |
        (models.Item.tags.ilike(f'%{query}%'))
    ).all()
    return jsonify([{
        "id": item.id,
        "name": item.name,
        "tags": item.tags,
        "x_coord": item.x_coord,
        "y_coord": item.y_coord
    } for item in items])

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
