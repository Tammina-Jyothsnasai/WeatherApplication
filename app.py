
from flask import Flask, jsonify, render_template  # type: ignore[reportMissingImports]
from database import get_db_connection
from routes.current_weather import current_weather_bp
from routes.forecast import forecast_bp
from routes.favorites_create import favorites_create_bp
from routes.favorites_read import favorites_read_bp
from routes.favorites_update import favorites_update_bp
from routes.favorites_delete import favorites_delete_bp

app = Flask(__name__)

# Register Blueprints
app.register_blueprint(current_weather_bp)
app.register_blueprint(forecast_bp)
app.register_blueprint(favorites_create_bp)
app.register_blueprint(favorites_read_bp)
app.register_blueprint(favorites_update_bp)
app.register_blueprint(favorites_delete_bp)

@app.route("/")
def home():
    return render_template("index.html")



# Application health check
@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy"}), 200


# Database health check
@app.route("/db-health", methods=["GET"])
def database_health():
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()

        return jsonify({
            "status": "success",
            "database": "connected"
        }), 200

    except Exception:
        app.logger.exception("Database connection check failed")
        return jsonify({
            "status": "error",
            "database": "unavailable"
        }), 503

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None and connection.is_connected():
            connection.close()

# Handle unknown URLs with a JSON response
@app.errorhandler(404)
def handle_not_found(error):
    return jsonify({
        "error": "Resource not found."
    }), 404


# Handle unsupported HTTP methods
@app.errorhandler(405)
def handle_method_not_allowed(error):
    return jsonify({
        "error": "HTTP method not allowed for this endpoint."
    }), 405


# Handle unexpected application errors
@app.errorhandler(500)
def handle_internal_server_error(error):
    app.logger.error("An unexpected application error occurred.")

    return jsonify({
        "error": "An unexpected server error occurred."
    }), 500



if __name__ == "__main__":
    app.run(debug=True)