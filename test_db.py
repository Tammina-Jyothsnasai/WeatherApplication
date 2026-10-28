from database import get_db_connection


def test_database_connection():
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute("SELECT DATABASE(), VERSION()")
        result = cursor.fetchone()

        print("MySQL connection successful!")
        print("Database:", result[0])
        print("MySQL version:", result[1])

    except Exception as error:
        print("MySQL connection failed.")
        print("Error:", error)

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None and connection.is_connected():
            connection.close()
            print("Database connection closed.")


if __name__ == "__main__":
    test_database_connection()
