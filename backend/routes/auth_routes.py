"""
Auth routes: /api/auth/register and /api/auth/login
"""

import re
from flask import Blueprint, request, jsonify
import bcrypt
import uuid

from models.database import get_connection
from middleware.auth import generate_token

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400
    if not _EMAIL_RE.match(email):
        return jsonify({"error": "Invalid email address"}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    conn = get_connection()
    try:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if existing:
            return jsonify({"error": "Email already registered"}), 409

        user_id = str(uuid.uuid4())
        password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

        with conn:
            conn.execute(
                "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)",
                (user_id, email, password_hash),
            )

        token = generate_token(user_id)
        return jsonify({"token": token, "user": {"id": user_id, "email": email}}), 201
    finally:
        conn.close()


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT id, email, password_hash FROM users WHERE email = ?", (email,)
        ).fetchone()

        if not row or not bcrypt.checkpw(password.encode(), row["password_hash"].encode()):
            return jsonify({"error": "Invalid email or password"}), 401

        token = generate_token(row["id"])
        return jsonify({"token": token, "user": {"id": row["id"], "email": row["email"]}}), 200
    finally:
        conn.close()
