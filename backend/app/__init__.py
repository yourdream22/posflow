from __future__ import annotations

import os

from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

load_dotenv()

db = SQLAlchemy()


def create_app() -> Flask:
    app = Flask(__name__)
    database_url = os.getenv("POSTGRES_URL") or os.getenv("DATABASE_URL", "")
    if not database_url.startswith("postgresql"):
        database_url = "postgresql+psycopg2://posflow:posflow@localhost:5432/posflow"
    session_cookie_secure = os.getenv("SESSION_COOKIE_SECURE", "1") == "1"
    app.config.update(
        SQLALCHEMY_DATABASE_URI=database_url,
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        SECRET_KEY=os.getenv("SECRET_KEY", "posflow-local-secret"),
        SESSION_COOKIE_NAME="webdev_app_session",
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="None" if session_cookie_secure else "Lax",
        SESSION_COOKIE_SECURE=session_cookie_secure,
    )

    db.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    from .routes import api_bp

    app.register_blueprint(api_bp, url_prefix="/api")

    @app.errorhandler(404)
    def not_found(_error):
        return jsonify({"error": "Not found"}), 404

    @app.errorhandler(500)
    def server_error(_error):
        db.session.rollback()
        return jsonify({"error": "Unexpected server error"}), 500

    return app


app = create_app()
