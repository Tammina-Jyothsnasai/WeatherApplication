from flask import Blueprint, jsonify, request
import requests

from config import Config
from city_resolver import fetch_openweather_resilient

current_weather_bp = Blueprint("current_weather", __name__)

OPENWEATHER_URL = "https://api.openweathermap.org/data/2.5/weather"


@current_weather_bp.route("/api/weather/current", methods=["GET"])
def current_weather():
    # Support search by city name or geographic coordinates
    city = request.args.get("city", "").strip()
    country = request.args.get("country", "").strip()
    lat = request.args.get("lat", "").strip()
    lon = request.args.get("lon", "").strip()

    # Validate that either city or lat/lon coordinates are provided
    if not city and not (lat and lon):
        return jsonify({
            "error": "Please provide a city name or location coordinates."
        }), 400

    # Check whether the API key is configured
    api_key = Config.OPENWEATHER_API_KEY
    if not api_key:
        return jsonify({
            "error": "OpenWeather API key is missing. Check your .env file."
        }), 500

    try:
        # Request current weather using multi-stage resilient search
        response = fetch_openweather_resilient(
            OPENWEATHER_URL,
            city=city,
            country=country,
            lat=lat,
            lon=lon,
            api_key=api_key,
            timeout=10
        )

        if response is None:
            return jsonify({
                "error": f"Could not find weather data for '{city}'."
            }), 404

        # Handle unsuccessful responses and show provider error
        if response.status_code != 200:
            try:
                provider_error = response.json()
            except ValueError:
                provider_error = {"message": response.text}

            provider_message = provider_error.get(
                "message",
                "No error message returned by OpenWeather."
            )

            if response.status_code == 404:
                return jsonify({
                    "error": f"City '{city}' not found. Please check spelling.",
                    "provider_status": response.status_code,
                    "provider_message": provider_message
                }), 404

            if response.status_code == 401:
                return jsonify({
                    "error": "OpenWeather rejected the API key. Check the key and its activation status.",
                    "provider_status": response.status_code,
                    "provider_message": provider_message
                }), 502

            return jsonify({
                "error": "OpenWeather could not provide weather data.",
                "provider_status": response.status_code,
                "provider_message": provider_message
            }), 502

        # Read successful JSON response
        data = response.json()

        # Extract weather details
        main = data.get("main", {})
        wind = data.get("wind", {})
        weather_list = data.get("weather", [])
        weather = weather_list[0] if weather_list else {}
        system = data.get("sys", {})

        # Extract coordinates and optional air quality
        coord = data.get("coord", {})
        lat_val = coord.get("lat")
        lon_val = coord.get("lon")

        aqi_info = None
        if lat_val is not None and lon_val is not None:
            try:
                aqi_resp = requests.get(
                    "https://api.openweathermap.org/data/2.5/air_pollution",
                    params={"lat": lat_val, "lon": lon_val, "appid": api_key},
                    timeout=3
                )
                if aqi_resp.status_code == 200:
                    aqi_data = aqi_resp.json()
                    aqi_items = aqi_data.get("list", [])
                    if aqi_items:
                        first_item = aqi_items[0]
                        aqi_info = {
                            "index": first_item.get("main", {}).get("aqi"),
                            "components": first_item.get("components", {})
                        }
            except Exception:
                aqi_info = None

        # Return backward-compatible and enriched weather metrics
        return jsonify({
            "city": data.get("name", city),
            "country": system.get("country", country),
            "temperature": main.get("temp"),
            "feels_like": main.get("feels_like"),
            "temp_min": main.get("temp_min"),
            "temp_max": main.get("temp_max"),
            "humidity": main.get("humidity"),
            "wind_speed": wind.get("speed"),
            "wind_deg": wind.get("deg", 0),
            "wind_gust": wind.get("gust"),
            "pressure": main.get("pressure"),
            "clouds": data.get("clouds", {}).get("all"),
            "visibility_km": (
                data.get("visibility") / 1000
                if data.get("visibility") is not None
                else None
            ),
            "description": weather.get("description", ""),
            "icon": weather.get("icon", ""),
            "weather_main": weather.get("main", ""),
            "sunrise": system.get("sunrise"),
            "sunset": system.get("sunset"),
            "dt": data.get("dt"),
            "timezone_offset": data.get("timezone", 0),
            "coord": {
                "lat": lat_val,
                "lon": lon_val
            },
            "aqi": aqi_info
        }), 200

    except requests.exceptions.Timeout:
        return jsonify({
            "error": "The weather service took too long to respond. Please try again."
        }), 504

    except requests.exceptions.RequestException:
        return jsonify({
            "error": "Could not connect to OpenWeather. Check your internet connection."
        }), 502
