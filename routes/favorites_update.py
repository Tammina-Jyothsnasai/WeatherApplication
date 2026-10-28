import re
from flask import Blueprint, jsonify, request
from mysql.connector import IntegrityError, Error

from database import get_db_connection

favorites_update_bp = Blueprint("favorites_update", __name__)


@favorites_update_bp.route(
    "/api/favorites/<int:favorite_id>",
    methods=["PUT"]
)
def update_favorite(favorite_id):
    # Step 1: Read and validate the JSON request
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "error": "A valid JSON request body is required."
        }), 400

    connection = None
    cursor = None

    try:
        # Step 2: Connect to MySQL
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        # Step 3: Check whether the favourite exists
        cursor.execute(
            """
            SELECT id, city, country, nickname
            FROM favorites
            WHERE id = %s
            """,
            (favorite_id,)
        )

        existing_favorite = cursor.fetchone()

        if existing_favorite is None:
            return jsonify({
                "error": f"No favourite city found with ID {favorite_id}."
            }), 404

        # Read optional or required fields, defaulting to existing values
        city = data.get("city")
        country = data.get("country")
        nickname = data.get("nickname")

        if city is not None:
            if not isinstance(city, str) or not city.strip():
                return jsonify({
                    "error": "City must be a non-empty string."
                }), 400
            city = city.strip()
            if len(city) > 100:
                return jsonify({
                    "error": "City must not exceed 100 characters."
                }), 400
        else:
            city = existing_favorite["city"]

        if country is not None:
            if not isinstance(country, str) or not country.strip():
                return jsonify({
                    "error": "Country must be a non-empty string."
                }), 400
            country = country.strip().upper()
            if len(country) != 2 or not re.fullmatch(r"[A-Z]{2}", country):
                return jsonify({
                    "error": "Country must be a valid two-letter code, such as IN or US."
                }), 400
        else:
            country = existing_favorite["country"]

        if nickname is not None:
            if not isinstance(nickname, str):
                return jsonify({
                    "error": "Nickname must be a string or null."
                }), 400
            nickname = nickname.strip()
            if nickname == "":
                nickname = None
            elif len(nickname) > 100:
                return jsonify({
                    "error": "Nickname must not exceed 100 characters."
                }), 400
        else:
            nickname = existing_favorite["nickname"]

        # Step 4: Update the existing favourite
        cursor.execute(
            """
            UPDATE favorites
            SET city = %s,
                country = %s,
                nickname = %s
            WHERE id = %s
            """,
            (city, country, nickname, favorite_id)
        )

        # Step 5: Save the changes
        connection.commit()

        # Step 6: Retrieve the updated favourite
        cursor.execute(
            """
            SELECT id, city, country, nickname, created_at
            FROM favorites
            WHERE id = %s
            """,
            (favorite_id,)
        )

        favorite = cursor.fetchone()

        if favorite is None:
            return jsonify({
                "error": "The updated favourite could not be retrieved."
            }), 500

        if favorite["created_at"] is not None:
            favorite["created_at"] = (
                favorite["created_at"].isoformat(sep=" ")
            )

        return jsonify({
            "message": "Favourite city updated successfully.",
            "favorite": favorite
        }), 200

    except IntegrityError as error:
        if connection is not None and connection.is_connected():
            connection.rollback()

        if error.errno == 1062:
            return jsonify({
                "error": "Another favourite already uses this city and country."
            }), 409

        return jsonify({
            "error": "A database constraint prevented this update."
        }), 500

    except Error:
        if connection is not None and connection.is_connected():
            connection.rollback()

        return jsonify({
            "error": "Unable to update the favourite city in the database."
        }), 503

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None and connection.is_connected():
            connection.close()
