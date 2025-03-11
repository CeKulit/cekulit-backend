from google.cloud import storage
from app.config import Config
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class StorageService:
    def __init__(self):
        self.client = storage.Client(project=Config.GCP_PROJECT_ID)
        self.bucket = self.client.bucket(Config.BUCKET_NAME)

    def upload_file(self, file_data, filename):
        try:
            blob_name = f"{Config.UPLOAD_FOLDER}{filename}"
            blob = self.bucket.blob(blob_name)
            blob.metadata = {
                "prediction_id": filename.split(".")[0],
                "uploaded_at": datetime.now(timezone.utc).isoformat()
            }
            blob.upload_from_string(file_data, content_type="image/jpeg")
            logger.info(f"Uploaded file to {blob_name}")
            return blob.public_url
        except Exception as e:
            logger.error(f"Failed to upload to GCS: {e}")
            raise

storage_service = StorageService()