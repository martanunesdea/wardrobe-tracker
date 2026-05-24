"""
Wardrobe App — Flask Backend Entry Point
========================================
Registers all route blueprints and starts the development server.

For production: use gunicorn or uWSGI instead of app.run().
  gunicorn -w 4 -b 0.0.0.0:5000 server:app
"""

import os
import sys

# Ensure local packages are importable when running via `python server.py`
sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, send_from_directory, g, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from models.database import init_db
from routes.auth_routes import auth_bp
from routes.collection_routes import collections_bp
from routes.item_routes import items_bp
from routes.wishlist_routes import wishlist_bp

limiter = Limiter(key_func=get_remote_address, default_limits=["200 per hour"])


def create_app() -> Flask:
    app = Flask(__name__)
    limiter.init_app(app)

    app.config["MAX_CONTENT_LENGTH"] = int(
        os.environ.get("MAX_CONTENT_LENGTH", 5 * 1024 * 1024)
    )

    # CORS — explicit origins only when credentials are enabled.
    origins_env = os.environ.get("CORS_ORIGINS", "http://localhost:3000").strip()
    allowed_origins = [o.strip() for o in origins_env.split(",") if o.strip()]
    if "*" in allowed_origins:
        raise RuntimeError("CORS_ORIGINS must not contain '*' when credentials are enabled")
    CORS(
        app,
        resources={r"/api/*": {"origins": allowed_origins}},
        supports_credentials=True,
    )

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(collections_bp)
    app.register_blueprint(items_bp)
    app.register_blueprint(wishlist_bp)

    # Rate-limit auth endpoints
    limiter.limit("5 per minute")(auth_bp)

    # Serve uploaded photos — filenames are UUIDs so unguessable by design.
    UPLOAD_FOLDER = os.environ.get(
        "UPLOAD_FOLDER", os.path.join(os.path.dirname(__file__), "uploads")
    )
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

    @app.route("/uploads/<filename>")
    def serve_upload(filename):
        return send_from_directory(UPLOAD_FOLDER, filename)

    @app.route("/api/health")
    def health():
        return {"status": "ok"}, 200

    @app.after_request
    def set_security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

    # Serve React production build when it exists (single-container deploy).
    FRONTEND_BUILD = os.path.join(os.path.dirname(__file__), "static_frontend")
    if os.path.isdir(FRONTEND_BUILD):
        @app.route("/", defaults={"path": ""})
        @app.route("/<path:path>")
        def serve_frontend(path):
            full = os.path.join(FRONTEND_BUILD, path)
            if path and os.path.isfile(full):
                return send_from_directory(FRONTEND_BUILD, path)
            return send_from_directory(FRONTEND_BUILD, "index.html")

    # Initialise database tables
    init_db()

    return app


app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "true").lower() == "true"
    print(f"[Server] Starting on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=debug)
