"""
Authentication middleware.
Validates JWT Bearer tokens and attaches user_id to Flask's g object.
"""

from functools import wraps
from flask import request, jsonify, g
import jwt
import os
import time

JWT_ALGORITHM = "HS256"
_DEV_SECRET = "dev-secret-DO-NOT-USE-IN-PROD"

_jwt_secret = os.environ.get("JWT_SECRET")
if not _jwt_secret:
    if os.environ.get("FLASK_DEBUG", "").lower() == "true":
        _jwt_secret = _DEV_SECRET
    else:
        raise RuntimeError(
            "JWT_SECRET environment variable must be set in non-debug mode"
        )
JWT_SECRET = _jwt_secret

TOKEN_EXPIRY_SECONDS = 60 * 60 * 24  # 24 hours


def generate_token(user_id: str) -> str:
    """Generate a signed JWT for the given user_id."""
    payload = {
        "sub": user_id,
        "iat": int(time.time()),
        "exp": int(time.time()) + TOKEN_EXPIRY_SECONDS,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def require_auth(f):
    """Decorator that validates the JWT and sets g.user_id."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401

        token = auth_header.split(" ", 1)[1]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            g.user_id = payload["sub"]
            if not g.user_id:
                return jsonify({"error": "Invalid token"}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

        return f(*args, **kwargs)
    return decorated
