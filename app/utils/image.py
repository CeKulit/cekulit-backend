import os
import hashlib
from app.config import Config
import logging

logger = logging.getLogger(__name__)

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in Config.ALLOWED_EXTENSIONS

def validate_file(file):
    if not file or file.filename == "":
        raise ValueError("No file selected")
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)
    if file_size > Config.MAX_FILE_SIZE:
        raise ValueError("File size exceeds 10MB limit")
    if not allowed_file(file.filename):
        raise ValueError("Invalid file type. Only JPG, JPEG, and PNG are allowed.")

def get_image_hash(image_bytes):
    return hashlib.md5(image_bytes).hexdigest()