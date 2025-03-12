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
                "prediction_id": filename.split(".")[0].replace("skin_type_prediction_", ""),
                "uploaded_at": datetime.now(timezone.utc).isoformat()
            }
            blob.upload_from_string(file_data, content_type="image/jpeg")
            logger.info("File uploaded to GCS: %s", blob_name)
            return blob.public_url
        except Exception as e:
            logger.error("Failed to upload to GCS: %s", str(e))
            raise

storage_service = StorageService()