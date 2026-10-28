
from importlib import import_module
from config import Config


def get_db_connection():
    """Create and return a MySQL database connection."""
    connector = import_module("mysql.connector")
    connection = connector.connect(
        host=Config.DB_HOST,
        port=Config.DB_PORT,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        database=Config.DB_NAME,
        connection_timeout=5
    )

    return connection
