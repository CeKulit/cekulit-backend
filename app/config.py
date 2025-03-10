import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    PORT = int(os.getenv("PORT", 5000))
    BUCKET_NAME = os.getenv("BUCKET_NAME")
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "uploads/")
    MODEL_PATH = os.getenv("MODEL_PATH", "models/skin_type.pth")
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg"}
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID")