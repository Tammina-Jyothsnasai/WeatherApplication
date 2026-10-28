import difflib
import requests

# Common aliases, regional variations, historic names, and frequent typos
CITY_ALIASES = {
    "hyderbad": "Hyderabad",
    "hydrabad": "Hyderabad",
    "hyderabad": "Hyderabad",
    "hyd": "Hyderabad",
    "secundrabad": "Secunderabad",
    "secunderbad": "Secunderabad",
    "secunderabad": "Secunderabad",
    "banglore": "Bengaluru",
    "bangalore": "Bengaluru",
    "bengaluru": "Bengaluru",
    "bombay": "Mumbai",
    "mumbai": "Mumbai",
    "madras": "Chennai",
    "chennai": "Chennai",
    "calcutta": "Kolkata",
    "kolkata": "Kolkata",
    "vizag": "Visakhapatnam",
    "vishakapatnam": "Visakhapatnam",
    "visakhpatnam": "Visakhapatnam",
    "visakhapatnam": "Visakhapatnam",
    "vijaywada": "Vijayawada",
    "vijayavada": "Vijayawada",
    "vijayawada": "Vijayawada",
    "benares": "Varanasi",
    "banaras": "Varanasi",
    "varanasi": "Varanasi",
    "gurgaon": "Gurugram",
    "gurugram": "Gurugram",
    "trivandrum": "Thiruvananthapuram",
    "thiruvananthapuram": "Thiruvananthapuram",
    "cochin": "Kochi",
    "kochi": "Kochi",
    "baroda": "Vadodara",
    "vadodara": "Vadodara",
    "pondicherry": "Puducherry",
    "puducherry": "Puducherry",
    "ahmedbad": "Ahmedabad",
    "ahemdabad": "Ahmedabad",
    "ahmedabad": "Ahmedabad",
    "delhi": "Delhi",
    "dheli": "Delhi",
    "newdelhi": "New Delhi",
    "new delhi": "New Delhi",
    "poona": "Pune",
    "pune": "Pune",
    "bhubneshwar": "Bhubaneswar",
    "bhubaneswar": "Bhubaneswar",
    "mysore": "Mysuru",
    "mysuru": "Mysuru",
    "mangalore": "Mangaluru",
    "mangaluru": "Mangaluru"
}

POPULAR_WORLD_CITIES = [
    "Hyderabad", "Secunderabad", "Bengaluru", "Bangalore", "Mumbai", "Delhi", "New Delhi",
    "Chennai", "Kolkata", "Ahmedabad", "Pune", "Surat", "Jaipur", "Lucknow", "Kanpur",
    "Nagpur", "Indore", "Thane", "Bhopal", "Visakhapatnam", "Patna", "Vadodara", "Ghaziabad",
    "Ludhiana", "Agra", "Nashik", "Faridabad", "Meerut", "Rajkot", "Varanasi", "Srinagar",
    "Aurangabad", "Dhanbad", "Amritsar", "Ranchi", "Coimbatore", "Jabalpur", "Gwalior",
    "Vijayawada", "Jodhpur", "Madurai", "Raipur", "Kota", "Guwahati", "Chandigarh", "Solapur",
    "Mysuru", "Gurugram", "Aligarh", "Jalandhar", "Bhubaneswar", "Salem", "Warangal",
    "Thiruvananthapuram", "Guntur", "Amravati", "Bikaner", "Noida", "Jamshedpur", "Bhilai",
    "Cuttack", "Kochi", "Nellore", "Bhavnagar", "Dehradun", "Rourkela", "Nanded", "Kolhapur",
    "Ajmer", "Ujjain", "Siliguri", "Jhansi", "Jammu", "Mangaluru", "Tirupati", "Kurnool",
    "Rajahmundry", "Tiruchirappalli", "Kakinada", "Nizamabad", "Khammam", "Eluru", "Anantapur",
    "Kadapa", "London", "New York", "Paris", "Tokyo", "Sydney", "Dubai", "Singapore",
    "Berlin", "Rome", "Madrid", "Toronto", "Chicago", "San Francisco", "Los Angeles",
    "Moscow", "Beijing", "Shanghai", "Hong Kong", "Seoul", "Bangkok", "Kuala Lumpur"
]

def fetch_openweather_resilient(endpoint_url, city, country, lat, lon, api_key, timeout=10):
    """
    Multi-stage resilient search:
    1. If lat/lon given, query directly.
    2. Normalize city input (strip punctuation, resolve known aliases/typos).
    3. Attempt 1: Query with city and country.
    4. Attempt 2: If 404, retry without country (fixes dropdown mismatch e.g. searching Hyderabad with US selected).
    5. Attempt 3: Fuzzy match city name against known popular cities.
    6. Attempt 4: OpenWeather Direct Geocoding fallback.
    """
    if lat and lon:
        params = {"lat": lat, "lon": lon, "appid": api_key, "units": "metric"}
        res = requests.get(endpoint_url, params=params, timeout=timeout)
        return res

    raw_city = (city or "").strip()
    raw_country = (country or "").strip().upper()

    # If city has comma, e.g. "Hyderabad, India" or "Hyderabad, IN"
    if "," in raw_city:
        parts = [p.strip() for p in raw_city.split(",", 1)]
        raw_city = parts[0]
        if not raw_country and len(parts) > 1:
            country_part = parts[1].upper()
            if country_part in ("INDIA", "IN"):
                raw_country = "IN"
            elif len(country_part) == 2:
                raw_country = country_part

    # Step 1: Check known aliases
    clean_key = raw_city.lower()
    normalized_city = CITY_ALIASES.get(clean_key, raw_city)

    # Step 2: If not in aliases, attempt fuzzy match
    if normalized_city == raw_city and len(raw_city) >= 3:
        lower_map = {c.lower(): c for c in POPULAR_WORLD_CITIES}
        matches = difflib.get_close_matches(clean_key, list(lower_map.keys()), n=1, cutoff=0.75)
        if matches:
            normalized_city = lower_map[matches[0]]

    # Prepare search sequence
    attempts = []
    # Attempt A: Normalized city + country
    if raw_country:
        attempts.append({"q": f"{normalized_city},{raw_country}"})
    # Attempt B: Normalized city alone (resolves country mismatch)
    attempts.append({"q": normalized_city})

    # If normalized city differs from raw, also try raw city
    if normalized_city != raw_city:
        if raw_country:
            attempts.append({"q": f"{raw_city},{raw_country}"})
        attempts.append({"q": raw_city})

    last_response = None
    for attempt_params in attempts:
        attempt_params["appid"] = api_key
        attempt_params["units"] = "metric"
        try:
            res = requests.get(endpoint_url, params=attempt_params, timeout=timeout)
            last_response = res
            if res.status_code == 200:
                return res
        except requests.exceptions.RequestException:
            continue

    # Attempt C: OpenWeather Direct Geocoding API fallback
    try:
        geo_url = "http://api.openweathermap.org/geo/1.0/direct"
        geo_params = {"q": normalized_city, "limit": 1, "appid": api_key}
        geo_res = requests.get(geo_url, params=geo_params, timeout=timeout)
        if geo_res.status_code == 200 and geo_res.json():
            coords = geo_res.json()[0]
            lat_found = coords.get("lat")
            lon_found = coords.get("lon")
            if lat_found is not None and lon_found is not None:
                coord_params = {"lat": lat_found, "lon": lon_found, "appid": api_key, "units": "metric"}
                final_res = requests.get(endpoint_url, params=coord_params, timeout=timeout)
                if final_res.status_code == 200:
                    return final_res
    except Exception:
        pass

    return last_response
