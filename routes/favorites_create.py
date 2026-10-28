
from flask import Blueprint, request, jsonify
from mysql.connector import IntegrityError, Error

from database import get_db_connection

favorites_create_bp = Blueprint(
    "favorites_create",
    __name__
)


@favorites_create_bp.route("/api/favorites", methods=["POST"])
def create_favorite():
    # Read the JSON request body
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "error": "A valid JSON request body is required."
        }), 400

    # Read and validate required fields
    city = data.get("city")
    country = data.get("country")
    nickname = data.get("nickname")

    if not isinstance(city, str) or not city.strip():
        return jsonify({
            "error": "City is required and must be a non-empty string."
        }), 400

    if not isinstance(country, str) or not country.strip():
        return jsonify({
            "error": "Country is required and must be a non-empty string."
        }), 400

    if nickname is not None and not isinstance(nickname, str):
        return jsonify({
            "error": "Nickname must be a string or null."
        }), 400

    # Remove unnecessary spaces
    city = city.strip()
    country = country.strip()
    nickname = nickname.strip() if nickname is not None else None

    if nickname == "":
        nickname = None

    # Validate database column lengths
    if len(city) > 100 or len(country) > 100:
        return jsonify({
            "error": "City and country must not exceed 100 characters."
        }), 400

    if nickname is not None and len(nickname) > 100:
        return jsonify({
            "error": "Nickname must not exceed 100 characters."
        }), 400

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        # Insert the favourite city safely
        insert_query = """
            INSERT INTO favorites (city, country, nickname)
            VALUES (%s, %s, %s)
        """

        cursor.execute(
            insert_query,
            (city, country, nickname)
        )

        # Save the inserted record
        connection.commit()

        favorite_id = cursor.lastrowid

        # Retrieve the complete created record
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
            raise RuntimeError("Created favourite could not be retrieved.")

        # Convert the timestamp into JSON-compatible text
        if favorite["created_at"] is not None:
            favorite["created_at"] = (
                favorite["created_at"].isoformat(sep=" ")
            )

        return jsonify({
            "message": "Favourite city created successfully.",
            "favorite": favorite
        }), 201

    except IntegrityError as error:
        if connection is not None and connection.is_connected():
            connection.rollback()

        # MySQL error 1062 means a duplicate unique-key value
        if error.errno == 1062:
            return jsonify({
                "error": "This city and country are already in favourites."
            }), 409

        return jsonify({
            "error": "A database constraint prevented this operation."
        }), 500

    except Error:
        if connection is not None and connection.is_connected():
            connection.rollback()

        return jsonify({
            "error": "Unable to access the database."
        }), 503

    except RuntimeError:
        if connection is not None and connection.is_connected():
            connection.rollback()

        return jsonify({
            "error": "The favourite was created but could not be retrieved."
        }), 500

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None and connection.is_connected():
            connection.close()
