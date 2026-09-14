"""Isolated browser-test server; never opens the recovered inventory database."""
from pathlib import Path
import sys
import tempfile
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import create_app, db
from models import Map, Item
from werkzeug.security import generate_password_hash
from waitress import serve

def main():
    with tempfile.TemporaryDirectory(prefix="ilab-browser-test-") as directory:
        root=Path(directory)
        app=create_app({
            "INSTANCE_PATH": str(root/"instance"),
            "SQLALCHEMY_DATABASE_URI":"sqlite:///"+(root/"test.db").as_posix(),
            "UPLOAD_FOLDER":str(root/"uploads"),
            "SECRET_KEY":"browser-test-only-secret-key-32-characters",
            "SESSION_COOKIE_NAME":"ilab_browser_test_session",
            "ADMIN_PASSWORD_HASH":generate_password_hash("browser-test-password"),
            "AI_ENABLED":False,
        })
        with app.app_context():
            db.create_all()
            db.session.add_all([
                Map(id=1,name="iLab",svg_path="/static/maps/main.png",model_path="/static/optimized/iLab.gltf",width=1024,height=1024),
                Map(id=2,name="Closet",svg_path="/static/maps/closet.svg",width=1312.74,height=864)
            ])
            db.session.flush()
            db.session.add_all([
                Item(id=1,name="Precision screwdriver",tags="<img src=x onerror=alert(1)>,electronics",
                     map_id=1,quantity=2,x_coord=0,y_coord=0,x_coord_model=0,y_coord_model=1,z_coord_model=2,
                     description="Keep this description.",link="https://example.com/manual",warning="glasses",zone="Cabinet A"),
                Item(id=2,name="Resin Wash",tags="resin",map_id=1,quantity=1,x_coord=666,y_coord=334,
                     x_coord_model=-1.0866,y_coord_model=-.125,z_coord_model=.113)
            ])
            db.session.commit()
        print("Isolated browser test server: http://127.0.0.1:5016",flush=True)
        serve(app,host="127.0.0.1",port=5016,threads=4)
if __name__=="__main__":
    main()
