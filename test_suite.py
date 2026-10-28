import unittest
import json
import re
from pathlib import Path
from app import app
from database import get_db_connection

class WeatherApplicationTestSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = app.test_client()

    def test_01_health_and_db_health(self):
        """Test health endpoints"""
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json.get("status"), "healthy")

        res_db = self.client.get("/db-health")
        self.assertEqual(res_db.status_code, 200)
        self.assertEqual(res_db.json.get("status"), "success")

    def test_02_initial_page_load(self):
        """Test home page loads with WeatherHub branding matching user design and without unwanted NextGen symbols"""
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        html = res.get_data(as_text=True)
        self.assertIn("WeatherHub", html)
        self.assertNotIn("NextGen", html)

    def test_03_search_valid_cities(self):
        """Test current weather endpoint for multiple valid cities"""
        cities = [("Vijayawada", "IN"), ("London", "GB"), ("Tokyo", "JP")]
        for city, country in cities:
            res = self.client.get(f"/api/weather/current?city={city}&country={country}")
            self.assertEqual(res.status_code, 200, f"Failed for {city}")
            data = res.json
            self.assertIn("temperature", data)
            self.assertIn("humidity", data)
            self.assertIn("wind_speed", data)
            self.assertIn("pressure", data)
            self.assertIn("sunrise", data)
            self.assertIn("sunset", data)
            self.assertIsNotNone(data.get("city"))

    def test_04_invalid_city_and_empty_input(self):
        """Test validation for empty and non-existent cities"""
        res_empty = self.client.get("/api/weather/current?city=")
        self.assertEqual(res_empty.status_code, 400)

        res_invalid = self.client.get("/api/weather/current?city=ThisCityDoesNotExistXYZ999&country=ZZ")
        self.assertIn(res_invalid.status_code, [404, 502])

    def test_05_forecast_endpoint(self):
        """Test forecast endpoint returns 3-hour chunks with min/max temps"""
        res = self.client.get("/api/weather/forecast?city=Vijayawada&country=IN")
        self.assertEqual(res.status_code, 200)
        data = res.json
        self.assertIn("forecasts", data)
        self.assertTrue(len(data["forecasts"]) > 0)
        first_entry = data["forecasts"][0]
        self.assertIn("dt", first_entry)
        self.assertIn("temperature", first_entry)
        self.assertIn("temp_min", first_entry)
        self.assertIn("temp_max", first_entry)
        self.assertIn("precipitation_probability", first_entry)

    def test_06_favorites_crud_lifecycle(self):
        """Test complete CRUD cycle for favourites: Create, Read, Update, Delete"""
        test_city = "Mumbai"
        test_country = "IN"
        test_nickname = "Financial Capital"

        # 1. Clean up prior test record if present
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM favorites WHERE city = %s AND country = %s", (test_city, test_country))
        conn.commit()
        conn.close()

        # 2. CREATE (POST)
        post_res = self.client.post("/api/favorites", json={
            "city": test_city,
            "country": test_country,
            "nickname": test_nickname
        })
        self.assertEqual(post_res.status_code, 201)
        created_fav = post_res.json.get("favorite")
        fav_id = created_fav["id"]
        self.assertEqual(created_fav["city"], test_city)

        # 3. READ (GET all & GET by ID)
        get_all = self.client.get("/api/favorites")
        self.assertEqual(get_all.status_code, 200)
        ids = [f["id"] for f in get_all.json["favorites"]]
        self.assertIn(fav_id, ids)

        get_one = self.client.get(f"/api/favorites/{fav_id}")
        self.assertEqual(get_one.status_code, 200)
        self.assertEqual(get_one.json["favorite"]["nickname"], test_nickname)

        # 4. UPDATE (PUT - editing nickname)
        updated_nickname = "Maximum City"
        put_res = self.client.put(f"/api/favorites/{fav_id}", json={
            "city": test_city,
            "country": test_country,
            "nickname": updated_nickname
        })
        self.assertEqual(put_res.status_code, 200)
        self.assertEqual(put_res.json["favorite"]["nickname"], updated_nickname)

        # Also test updating nickname alone
        put_nick_res = self.client.put(f"/api/favorites/{fav_id}", json={
            "nickname": "Gateway of India"
        })
        self.assertEqual(put_nick_res.status_code, 200)
        self.assertEqual(put_nick_res.json["favorite"]["nickname"], "Gateway of India")

        # 5. DELETE
        del_res = self.client.delete(f"/api/favorites/{fav_id}")
        self.assertEqual(del_res.status_code, 200)
        self.assertEqual(del_res.json["deleted_id"], fav_id)

        # Verify it's gone
        get_del = self.client.get(f"/api/favorites/{fav_id}")
        self.assertEqual(get_del.status_code, 404)

    def test_07_api_key_security_in_frontend(self):
        """Verify API keys or secret tokens are never exposed in frontend files"""
        frontend_files = [
            Path("templates/index.html"),
            Path("static/js/app.js"),
            Path("static/css/style.css")
        ]
        api_key_regex = re.compile(r"8981b0442aba7130b7fc42082a5e4740")
        for f in frontend_files:
            content = f.read_text(encoding="utf-8")
            self.assertIsNone(api_key_regex.search(content), f"API key exposed in {f}!")
            self.assertNotIn("OPENWEATHER_API_KEY", content, f"API env var mentioned in {f}!")

if __name__ == "__main__":
    unittest.main()
