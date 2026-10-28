import os
from pathlib import Path

# Load settings from .env file (checks local directory and project root)
candidate_paths = [
    Path(__file__).with_name(".env"),
    Path(__file__).resolve().parent.parent / ".env",
    Path.cwd() / ".env"
]

for env_path in candidate_paths:
    if env_path.is_file():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                value = value.strip().strip("\"'")
                os.environ.setdefault(key.strip(), value)

class Config:
    OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", "3306"))
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_NAME = os.getenv("DB_NAME", "weatherhub_db")
    DEFAULT_CITY = os.getenv("DEFAULT_CITY", "Vijayawada")
