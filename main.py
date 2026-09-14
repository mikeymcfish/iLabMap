"""Run a local production WSGI server without debug mode or background jobs."""
import os
from app import create_app

app = create_app()

if __name__ == "__main__":
    from waitress import serve
    serve(app, host=os.getenv("ILAB_HOST", "127.0.0.1"), port=int(os.getenv("ILAB_PORT", "5015")),
          threads=6, max_request_body_size=8 * 1024 * 1024)
