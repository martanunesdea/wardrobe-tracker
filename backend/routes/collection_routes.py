"""
Collections routes: CRUD for wardrobe collections.
Collections are nestable via parent_id.
"""

from flask import Blueprint, request, jsonify, g
import uuid

from models.database import get_connection
from middleware.auth import require_auth

collections_bp = Blueprint("collections", __name__, url_prefix="/api/collections")


def _collection_to_dict(row) -> dict:
    return {
        "id": row["id"],
        "parentId": row["parent_id"],
        "name": row["name"],
        "targetItemCount": row["target_item_count"],
        "targetAvgRating": row["target_avg_rating"],
        "sortOrder": row["sort_order"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


@collections_bp.route("", methods=["GET"])
@require_auth
def list_collections():
    """Return all collections for the authenticated user, with live stats."""
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            WITH RECURSIVE descendants(root_id, id, depth) AS (
                SELECT id, id, 0
                FROM collections
                WHERE user_id = ?
              UNION ALL
                SELECT d.root_id, c.id, d.depth + 1
                FROM descendants d
                JOIN collections c
                  ON c.parent_id = d.id
                 AND c.user_id = ?
                WHERE d.depth < 20
            )
            SELECT c.*,
                   COUNT(i.id) AS item_count,
                   AVG(i.rating) AS avg_rating
            FROM collections c
            LEFT JOIN descendants d
              ON d.root_id = c.id
            LEFT JOIN items i
              ON i.collection_id = d.id
             AND i.user_id = c.user_id
            WHERE c.user_id = ?
            GROUP BY c.id
            ORDER BY c.sort_order, c.name
            """,
            (g.user_id, g.user_id, g.user_id),
        ).fetchall()

        result = []
        for row in rows:
            d = _collection_to_dict(row)
            d["itemCount"] = row["item_count"] or 0
            d["avgRating"] = round(row["avg_rating"], 2) if row["avg_rating"] else 0.0
            result.append(d)

        return jsonify(result), 200
    finally:
        conn.close()


@collections_bp.route("", methods=["POST"])
@require_auth
def create_collection():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Name is required"}), 400

    collection_id = str(uuid.uuid4())
    conn = get_connection()
    try:
        with conn:
            conn.execute(
                """INSERT INTO collections
                   (id, user_id, parent_id, name, target_item_count, target_avg_rating, sort_order)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    collection_id,
                    g.user_id,
                    data.get("parentId"),
                    name,
                    int(data.get("targetItemCount", 10)),
                    float(data.get("targetAvgRating", 4.0)),
                    int(data.get("sortOrder", 0)),
                ),
            )
        row = conn.execute("SELECT * FROM collections WHERE id = ?", (collection_id,)).fetchone()
        return jsonify(_collection_to_dict(row)), 201
    finally:
        conn.close()


@collections_bp.route("/<collection_id>", methods=["PUT"])
@require_auth
def update_collection(collection_id):
    data = request.get_json(silent=True) or {}
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT id FROM collections WHERE id = ? AND user_id = ?",
            (collection_id, g.user_id),
        ).fetchone()
        if not row:
            return jsonify({"error": "Collection not found"}), 404

        fields, values = [], []
        for key, col in [("name", "name"), ("parentId", "parent_id"),
                          ("targetItemCount", "target_item_count"),
                          ("targetAvgRating", "target_avg_rating"),
                          ("sortOrder", "sort_order")]:
            if key in data:
                fields.append(f"{col} = ?")
                values.append(data[key])

        if not fields:
            return jsonify({"error": "No fields to update"}), 400

        fields.append("updated_at = CURRENT_TIMESTAMP")
        values.extend([collection_id, g.user_id])

        with conn:
            conn.execute(
                f"UPDATE collections SET {', '.join(fields)} WHERE id = ? AND user_id = ?",
                values,
            )

        row = conn.execute("SELECT * FROM collections WHERE id = ?", (collection_id,)).fetchone()
        return jsonify(_collection_to_dict(row)), 200
    finally:
        conn.close()


@collections_bp.route("/<collection_id>", methods=["DELETE"])
@require_auth
def delete_collection(collection_id):
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT id FROM collections WHERE id = ? AND user_id = ?",
            (collection_id, g.user_id),
        ).fetchone()
        if not row:
            return jsonify({"error": "Collection not found"}), 404

        with conn:
            conn.execute(
                "DELETE FROM collections WHERE id = ? AND user_id = ?",
                (collection_id, g.user_id),
            )
        return jsonify({"deleted": collection_id}), 200
    finally:
        conn.close()
