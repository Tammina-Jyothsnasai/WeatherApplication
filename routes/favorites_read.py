
from flask import Blueprint, jsonify  # pyright: ignore[reportMissingImports]
from database import get_db_connection

favorites_read_bp = Blueprint("favorites_read", __name__)


# GET: Retrieve all favourite cities
@favorites_read_bp.route("/api/favorites", methods=["GET"])
def get_favorites():
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        query = """
            SELECT id, city, country, nickname, created_at
            FROM favorites
            ORDER BY id ASC
        """
        cursor.execute(query)
        favorites = cursor.fetchall()

        for favorite in favorites:
            if favorite["created_at"] is not None:
                favorite["created_at"] = favorite["created_at"].isoformat(sep=" ")

        return jsonify({
            "count": len(favorites),
            "favorites": favorites
        }), 200

    except Exception:
        return jsonify({
            "error": "Unable to retrieve favourite cities from the database."
        }), 503

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None and connection.is_connected():
            connection.close()


# GET: Retrieve one favourite city by ID
@favorites_read_bp.route("/api/favorites/<int:favorite_id>", methods=["GET"])
def get_favorite_by_id(favorite_id):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        query = """
            SELECT id, city, country, nickname, created_at
            FROM favorites
            WHERE id = %s
        """
        cursor.execute(query, (favorite_id,))
        favorite = cursor.fetchone()

        if favorite is None:
            return jsonify({
                "error": f"No favourite city found with ID {favorite_id}."
            }), 404

        if favorite["created_at"] is not None:
            favorite["created_at"] = favorite["created_at"].isoformat(sep=" ")

        return jsonify({"favorite": favorite}), 200

    except Exception:
        return jsonify({
            "error": "Unable to retrieve the favourite city from the database."
        }), 503

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None and connection.is_connected():
            connection.close()
