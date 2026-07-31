"""
Application configuration for the Movie Recommendation System.
Loads environment variables and sets defaults.
"""
import os
from dotenv import load_dotenv  # type: ignore[import]

# Load environment variables from .env file
load_dotenv()


class Config: # pylint: disable=too-few-public-methods
    """Configuration class for Flask application settings."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'default-fallback-secret')
    TMDB_API_KEY = os.environ.get('TMDB_API_KEY', '')

    # DB configuration
    DB_HOST = os.environ.get('DB_HOST', 'localhost')
    DB_USER = os.environ.get('DB_USER', 'root')
    DB_PASSWORD = os.environ.get('DB_PASSWORD', '')
    DB_NAME = os.environ.get('DB_NAME', 'movie_recommendation_system')
