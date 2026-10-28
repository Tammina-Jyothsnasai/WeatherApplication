from flask import Blueprint, jsonify, request
import requests

from config import Config
from city_resolver import fetch_openweather_resilient

forecast_bp = Blueprint("forecast", __name__)

OPENWEATHER_FORECAST_URL = (
    "https://api.openweathermap.org/data/2.5/forecast"
)


@forecast_bp.route("/api/weather/forecast", methods=["GET"])
def get_forecast():
    city = request.args.get("city", "").strip()
    country = request.args.get("country", "").strip()
    lat = request.args.get("lat", "").strip()
    lon = request.args.get("lon", "").strip()

    # 1. Validate that either city or lat/lon coordinates are provided
    if not city and not (lat and lon):
        return jsonify({
            "error": "Please provide a city name or location coordinates."
        }), 400

    # 2. Check the API key
    api_key = Config.OPENWEATHER_API_KEY
    if not api_key:
        return jsonify({
            "error": "OpenWeather API key is missing. Check your .env file."
        }), 500

    try:
        # 3. Request five-day / 3-hour forecast using resilient multi-stage search
        response = fetch_openweather_resilient(
            OPENWEATHER_FORECAST_URL,
            city=city,
            country=country,
            lat=lat,
            lon=lon,
            api_key=api_key,
            timeout=10
        )

        if response is None:
            return jsonify({
                "error": f"City '{city}' not found."
            }), 404

        if response.status_code != 200:
            try:
                provider_error = response.json()
            except ValueError:
                provider_error = {}

            provider_message = provider_error.get(
                "message",
                "OpenWeather could not return forecast data."
            )

            if response.status_code == 404:
                return jsonify({
                    "error": f"City '{city}' not found.",
                    "provider_message": provider_message
                }), 404

            if response.status_code == 401:
                return jsonify({
                    "error": "OpenWeather rejected the API key.",
                    "provider_message": provider_message
                }), 502

            return jsonify({
                "error": "Unable to retrieve forecast data.",
                "provider_message": provider_message
            }), 502

        data = response.json()

        # 4. Check that forecast entries exist
        forecast_entries = data.get("list", [])
        if not forecast_entries:
            return jsonify({
                "error": "No forecast data is available for this location."
            }), 404

        # 5. Extract fields needed by frontend (both hourly and daily aggregations)
        forecasts = []
        for entry in forecast_entries:
            main = entry.get("main", {})
            wind = entry.get("wind", {})
            weather_list = entry.get("weather", [])
            weather = weather_list[0] if weather_list else {}

            forecasts.append({
                "dt": entry.get("dt"),
                "dt_txt": entry.get("dt_txt"),
                "temperature": main.get("temp"),
                "temp_min": main.get("temp_min"),
                "temp_max": main.get("temp_max"),
                "feels_like": main.get("feels_like"),
                "humidity": main.get("humidity"),
                "wind_speed": wind.get("speed"),
                "description": weather.get(
                    "description", "Not available"
                ),
                "icon": weather.get("icon", ""),
                "weather_main": weather.get("main", ""),
                "precipitation_probability": entry.get("pop", 0)
            })

        city_data = data.get("city", {})

        return jsonify({
            "city": city_data.get("name", city),
            "country": city_data.get("country", country),
            "timezone_offset": city_data.get("timezone", 0),
            "forecasts": forecasts
        }), 200

    except requests.exceptions.Timeout:
        return jsonify({
            "error": "The forecast service took too long to respond."
        }), 504

    except requests.exceptions.RequestException:
        return jsonify({
            "error": "Could not connect to OpenWeather. Check your internet connection."
        }), 502
