import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    FLASK_ENV = os.getenv("FLASK_ENV", "production")
    PORT = int(os.getenv("PORT", 8080))
    BUCKET_NAME = os.getenv("BUCKET_NAME")
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "uploads/")
    MODEL_PATH = os.getenv("MODEL_PATH", "models/skin_type.pth")
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg"}
    MAX_FILE_SIZE = 10 * 1024 * 1024
    GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID")

class DevelopmentConfig(Config):
    """Development configuration."""
    FLASK_ENV = "development"

class ProductionConfig(Config):
    """Production configuration."""
    FLASK_ENV = "production"

def get_config():
    """Factory function to return config based on environment."""
    env = os.getenv("FLASK_ENV", "production")
    if env == "development":
        return DevelopmentConfig()
    return ProductionConfig()

config = get_config()