
from flask import Blueprint, jsonify  # type: ignore[reportMissingImports]
from database import get_db_connection

favorites_delete_bp = Blueprint("favorites_delete", __name__)


@favorites_delete_bp.route(
    "/api/favorites/<int:favorite_id>",
    methods=["DELETE"]
)
def delete_favorite(favorite_id):
    connection = None
    cursor = None

    try:
        # Step 1: Connect to the database
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        # Step 2: Check whether the favourite ID exists
        cursor.execute(
            """
            SELECT id
            FROM favorites
            WHERE id = %s
            """,
            (favorite_id,)
        )

        favorite = cursor.fetchone()

        if favorite is None:
            return jsonify({
                "error": f"No favourite city found with ID {favorite_id}."
            }), 404

        # Step 3: Delete only the record matching this ID
        cursor.execute(
            """
            DELETE FROM favorites
            WHERE id = %s
            """,
            (favorite_id,)
        )

        # Step 4: Save the deletion
        connection.commit()

        # Step 5: Return confirmation
        return jsonify({
            "message": "Favourite city deleted successfully.",
            "deleted_id": favorite_id
        }), 200

    except Exception:
        if connection is not None and connection.is_connected():
            connection.rollback()

        return jsonify({
            "error": "Unable to delete the favourite city from the database."
        }), 503

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None and connection.is_connected():
            connection.close()
