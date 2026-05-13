"""
Wishlist routes: save desired items and promote them to the wardrobe.
Also provides the Shopping Priority ranking.
"""

from flask import Blueprint, request, jsonify, g
import uuid

from models.database import get_connection
from middleware.auth import require_auth
from utils.validation import parse_float

wishlist_bp = Blueprint("wishlist", __name__, url_prefix="/api/wishlist")

FORMULAS = ("simple", "harmonic", "min_based")


def _score_simple(item_fill: float, rating_fill: float) -> float:
    return item_fill * 50 + rating_fill * 50


def _score_harmonic(item_fill: float, rating_fill: float) -> float:
    a, b = item_fill, rating_fill
    if a + b == 0:
        return 0.0
    return 100.0 * (2 * a * b) / (a + b)


def _score_min_based(item_fill: float, rating_fill: float) -> float:
    a, b = item_fill, rating_fill
    avg = (a + b) / 2
    return 100.0 * (0.7 * min(a, b) + 0.3 * avg)


def _priority_score(formula: str, item_fill: float, rating_fill: float) -> float:
    if formula == "simple":
        return _score_simple(item_fill, rating_fill)
    if formula == "harmonic":
        return _score_harmonic(item_fill, rating_fill)
    if formula == "min_based":
        return _score_min_based(item_fill, rating_fill)
    raise ValueError(f"Unknown formula: {formula}")


def _wish_to_dict(row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "url": row["url"],
        "notes": row["notes"],
        "createdAt": row["created_at"],
    }


@wishlist_bp.route("", methods=["GET"])
@require_auth
def list_wishlist():
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM wishlist WHERE user_id = ? ORDER BY created_at DESC LIMIT 500",
            (g.user_id,),
        ).fetchall()
        return jsonify([_wish_to_dict(r) for r in rows]), 200
    finally:
        conn.close()


@wishlist_bp.route("", methods=["POST"])
@require_auth
def create_wish():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Name is required"}), 400

    url = (data.get("url") or "").strip() or None
    if url and not url.startswith(("http://", "https://")):
        return jsonify({"error": "URL must start with http:// or https://"}), 400

    wish_id = str(uuid.uuid4())
    conn = get_connection()
    try:
        with conn:
            conn.execute(
                "INSERT INTO wishlist (id, user_id, name, url, notes) VALUES (?, ?, ?, ?, ?)",
                (wish_id, g.user_id, name, url, data.get("notes") or None),
            )
        row = conn.execute("SELECT * FROM wishlist WHERE id = ?", (wish_id,)).fetchone()
        return jsonify(_wish_to_dict(row)), 201
    finally:
        conn.close()


@wishlist_bp.route("/<wish_id>", methods=["DELETE"])
@require_auth
def delete_wish(wish_id):
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT id FROM wishlist WHERE id = ? AND user_id = ?", (wish_id, g.user_id)
        ).fetchone()
        if not row:
            return jsonify({"error": "Wishlist item not found"}), 404
        with conn:
            conn.execute(
                "DELETE FROM wishlist WHERE id = ? AND user_id = ?", (wish_id, g.user_id)
            )
        return jsonify({"deleted": wish_id}), 200
    finally:
        conn.close()


@wishlist_bp.route("/<wish_id>/add-to-wardrobe", methods=["POST"])
@require_auth
def add_to_wardrobe(wish_id):
    """
    Promote a wishlist item to a wardrobe item.
    Body: { collectionId?, rating, brand?, size?, price?, dateBought? }
    """
    data = request.get_json(silent=True) or {}
    conn = get_connection()
    try:
        wish = conn.execute(
            "SELECT * FROM wishlist WHERE id = ? AND user_id = ?", (wish_id, g.user_id)
        ).fetchone()
        if not wish:
            return jsonify({"error": "Wishlist item not found"}), 404

        try:
            rating = parse_float(data.get("rating", 3.0), min_value=1, max_value=5, field="Rating")
        except ValueError:
            return jsonify({"error": "Rating must be between 1 and 5"}), 400

        try:
            price = (
                parse_float(data.get("price"), min_value=0, field="Price")
                if data.get("price") not in (None, "", False)
                else None
            )
        except ValueError:
            return jsonify({"error": "Price must be 0 or greater"}), 400

        item_id = str(uuid.uuid4())

        with conn:
            conn.execute(
                """INSERT INTO items
                   (id, user_id, collection_id, name, rating, brand, size, price, date_bought, times_used)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)""",
                (
                    item_id, g.user_id,
                    data.get("collectionId") or None,
                    wish["name"], rating,
                    data.get("brand") or None,
                    data.get("size") or None,
                    price,
                    data.get("dateBought") or None,
                ),
            )
            conn.execute(
                "DELETE FROM wishlist WHERE id = ? AND user_id = ?", (wish_id, g.user_id)
            )

        row = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
        return jsonify({
            "item": {
                "id": row["id"],
                "collectionId": row["collection_id"],
                "name": row["name"],
                "rating": row["rating"],
                "timesUsed": row["times_used"],
            }
        }), 201
    finally:
        conn.close()


@wishlist_bp.route("/shopping-priority", methods=["GET"])
@require_auth
def shopping_priority():
    """
    Score each collection from item_fill and rating_fill (each capped at 1.0).

    Query: formula — one of simple | harmonic | min_based (default simple).
      - simple: 50/50 weighted average of fills
      - harmonic: 100 * 2ab/(a+b) on fills (penalises imbalance)
      - min_based: 100 * (0.7 * min(a,b) + 0.3 * mean(a,b))

    Lower score = higher priority. Returns sorted list with RAG status.
    """
    formula = (request.args.get("formula") or "simple").strip().lower()
    if formula not in FORMULAS:
        return jsonify({"error": f"formula must be one of: {', '.join(FORMULAS)}"}), 400

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
            SELECT c.id, c.name, c.target_item_count, c.target_avg_rating,
                   COUNT(i.id) AS item_count,
                   COALESCE(AVG(i.rating), 0) AS avg_rating
            FROM collections c
            LEFT JOIN descendants d
              ON d.root_id = c.id
            LEFT JOIN items i
              ON i.collection_id = d.id
             AND i.user_id = c.user_id
            WHERE c.user_id = ?
            GROUP BY c.id
            ORDER BY c.name
            """,
            (g.user_id, g.user_id, g.user_id),
        ).fetchall()

        priorities = []
        for row in rows:
            target_items = row["target_item_count"] or 1
            target_rating = row["target_avg_rating"] or 4.0
            item_fill = min((row["item_count"] / target_items), 1.0)
            rating_fill = min((row["avg_rating"] / target_rating), 1.0) if row["avg_rating"] else 0.0
            score = _priority_score(formula, item_fill, rating_fill)

            if score < 40:
                status = "red"
            elif score < 75:
                status = "amber"
            else:
                status = "green"

            priorities.append({
                "collectionId": row["id"],
                "collectionName": row["name"],
                "score": round(score, 1),
                "status": status,
                "itemCount": row["item_count"],
                "targetItemCount": row["target_item_count"],
                "avgRating": round(row["avg_rating"], 2),
                "targetAvgRating": row["target_avg_rating"],
                "itemFillPct": round(item_fill * 100, 1),
            })

        priorities.sort(key=lambda x: x["score"])
        return jsonify(priorities), 200
    finally:
        conn.close()
