"""
Items routes: CRUD for clothing items.
Handles photo uploads via multipart/form-data.
"""

from flask import Blueprint, request, jsonify, g
import uuid
import os
from datetime import date

from models.database import get_connection
from middleware.auth import require_auth
from utils.validation import parse_float, parse_int

items_bp = Blueprint("items", __name__, url_prefix="/api/items")

UPLOAD_FOLDER = os.environ.get(
    "UPLOAD_FOLDER", os.path.join(os.path.dirname(__file__), "../uploads")
)
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


def _allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def _item_to_dict(row) -> dict:
    return {
        "id": row["id"],
        "collectionId": row["collection_id"],
        "name": row["name"],
        "rating": row["rating"],
        "brand": row["brand"],
        "size": row["size"],
        "price": row["price"],
        "dateBought": row["date_bought"],
        "timesUsed": row["times_used"],
        "lastUsed": row["last_used"],
        "photoUrl": row["photo_url"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


@items_bp.route("", methods=["GET"])
@require_auth
def list_items():
    """List all items. Optionally filter by ?collectionId=..."""
    collection_id = request.args.get("collectionId")
    conn = get_connection()
    try:
        if collection_id:
            rows = conn.execute(
                "SELECT * FROM items WHERE user_id = ? AND collection_id = ? ORDER BY name LIMIT 500",
                (g.user_id, collection_id),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM items WHERE user_id = ? ORDER BY name LIMIT 500",
                (g.user_id,),
            ).fetchall()
        return jsonify([_item_to_dict(r) for r in rows]), 200
    finally:
        conn.close()


@items_bp.route("", methods=["POST"])
@require_auth
def create_item():
    """Create item. Accepts JSON or multipart/form-data (for photo)."""
    if request.content_type and "multipart" in request.content_type:
        if request.content_length and request.content_length > MAX_FILE_SIZE:
            return jsonify({"error": "File too large"}), 413
        data = request.form.to_dict()
        photo_file = request.files.get("photo")
    else:
        data = request.get_json(silent=True) or {}
        photo_file = None

    name = (data.get("name") or "").strip()
    rating = data.get("rating")

    if not name:
        return jsonify({"error": "Name is required"}), 400
    try:
        rating = parse_float(rating, min_value=1, max_value=5, field="Rating")
    except ValueError:
        return jsonify({"error": "Rating must be between 1 and 5"}), 400

    try:
        times_used = parse_int(data.get("timesUsed", 0), min_value=0, field="Times used")
    except ValueError:
        return jsonify({"error": "Times used must be 0 or greater"}), 400

    try:
        price = (
            parse_float(data.get("price"), min_value=0, field="Price")
            if data.get("price") not in (None, "", False)
            else None
        )
    except ValueError:
        return jsonify({"error": "Price must be 0 or greater"}), 400

    photo_url = None
    if photo_file and _allowed_file(photo_file.filename):
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        ext = photo_file.filename.rsplit(".", 1)[1].lower()
        filename = f"{uuid.uuid4()}.{ext}"
        photo_file.save(os.path.join(UPLOAD_FOLDER, filename))
        photo_url = f"/uploads/{filename}"

    item_id = str(uuid.uuid4())
    conn = get_connection()
    try:
        with conn:
            conn.execute(
                """INSERT INTO items
                   (id, user_id, collection_id, name, rating, brand, size, price,
                    date_bought, times_used, last_used, photo_url)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    item_id, g.user_id,
                    data.get("collectionId") or None,
                    name, rating,
                    data.get("brand") or None,
                    data.get("size") or None,
                    price,
                    data.get("dateBought") or None,
                    times_used,
                    data.get("lastUsed") or None,
                    photo_url,
                ),
            )
        row = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
        return jsonify(_item_to_dict(row)), 201
    finally:
        conn.close()


@items_bp.route("/<item_id>", methods=["PUT"])
@require_auth
def update_item(item_id):
    if request.content_type and "multipart" in request.content_type:
        if request.content_length and request.content_length > MAX_FILE_SIZE:
            return jsonify({"error": "File too large"}), 413
        data = request.form.to_dict()
        photo_file = request.files.get("photo")
    else:
        data = request.get_json(silent=True) or {}
        photo_file = None

    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM items WHERE id = ? AND user_id = ?", (item_id, g.user_id)
        ).fetchone()
        if not row:
            return jsonify({"error": "Item not found"}), 404

        photo_url = row["photo_url"]
        if photo_file and _allowed_file(photo_file.filename):
            os.makedirs(UPLOAD_FOLDER, exist_ok=True)
            ext = photo_file.filename.rsplit(".", 1)[1].lower()
            filename = f"{uuid.uuid4()}.{ext}"
            photo_file.save(os.path.join(UPLOAD_FOLDER, filename))
            photo_url = f"/uploads/{filename}"
            # Best-effort cleanup of the old photo to avoid unbounded disk growth.
            old = row["photo_url"]
            if old and old.startswith("/uploads/"):
                old_path = os.path.join(UPLOAD_FOLDER, old.split("/uploads/", 1)[1])
                try:
                    if os.path.exists(old_path):
                        os.remove(old_path)
                except OSError:
                    pass

        # Auto-update last_used if timesUsed is being incremented
        try:
            new_times_used = parse_int(
                data.get("timesUsed", row["times_used"]),
                min_value=0,
                field="Times used",
            )
        except ValueError:
            return jsonify({"error": "Times used must be 0 or greater"}), 400

        new_last_used = data.get("lastUsed", row["last_used"])
        if new_times_used > (row["times_used"] or 0):
            new_last_used = date.today().isoformat()

        try:
            new_rating = parse_float(
                data.get("rating", row["rating"]),
                min_value=1,
                max_value=5,
                field="Rating",
            )
        except ValueError:
            return jsonify({"error": "Rating must be between 1 and 5"}), 400

        try:
            new_price = (
                parse_float(data.get("price"), min_value=0, field="Price")
                if data.get("price") not in (None, "", False)
                else row["price"]
            )
        except ValueError:
            return jsonify({"error": "Price must be 0 or greater"}), 400

        with conn:
            conn.execute(
                """UPDATE items SET
                   collection_id = ?,
                   name = ?,
                   rating = ?,
                   brand = ?,
                   size = ?,
                   price = ?,
                   date_bought = ?,
                   times_used = ?,
                   last_used = ?,
                   photo_url = ?,
                   updated_at = CURRENT_TIMESTAMP
                   WHERE id = ? AND user_id = ?""",
                (
                    data.get("collectionId", row["collection_id"]) or None,
                    data.get("name", row["name"]),
                    new_rating,
                    data.get("brand", row["brand"]) or None,
                    data.get("size", row["size"]) or None,
                    new_price,
                    data.get("dateBought", row["date_bought"]) or None,
                    new_times_used,
                    new_last_used,
                    photo_url,
                    item_id, g.user_id,
                ),
            )

        row = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
        return jsonify(_item_to_dict(row)), 200
    finally:
        conn.close()


@items_bp.route("/<item_id>", methods=["DELETE"])
@require_auth
def delete_item(item_id):
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT id FROM items WHERE id = ? AND user_id = ?", (item_id, g.user_id)
        ).fetchone()
        if not row:
            return jsonify({"error": "Item not found"}), 404

        with conn:
            conn.execute("DELETE FROM items WHERE id = ? AND user_id = ?", (item_id, g.user_id))
        return jsonify({"deleted": item_id}), 200
    finally:
        conn.close()
