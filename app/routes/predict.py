from flask import Blueprint, request, jsonify, render_template
from app.models.skin_type import model
from app.services.storage import storage_service
from app.utils.image import validate_file, get_image_hash
from concurrent.futures import ThreadPoolExecutor
import uuid
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

predict_bp = Blueprint("predict", __name__)
thread_pool = ThreadPoolExecutor(max_workers=2)

@predict_bp.route("/")
def index():
    return render_template("index.html")

@predict_bp.route("/predict", methods=["POST"])
def predict():
    if "photo" not in request.files:
        return jsonify({"message": "No file uploaded", "data": None}), 400
    
    file = request.files["photo"]
    try:
        validate_file(file)
        img_bytes = file.read()
        image_hash = get_image_hash(img_bytes)
        prediction_id = str(uuid.uuid4()).replace("-", "_")
        
        def run_prediction():
            image_tensor = model.preprocess(img_bytes)
            return model.predict(image_tensor)

        def upload_to_storage():
            filename = f"skin_type_prediction_{prediction_id}.{file.filename.rsplit('.', 1)[1].lower()}"
            return storage_service.upload_file(img_bytes, filename)

        prediction_future = thread_pool.submit(run_prediction)
        storage_future = thread_pool.submit(upload_to_storage)

        prediction = prediction_future.result()
        image_url = storage_future.result()

        response = {
            "message": "Model predicted successfully",
            "data": {
                "id": prediction_id,
                "result": prediction["result"],
                "confidenceScore": prediction["confidence"],
                "isAboveThreshold": prediction["confidence"] > 0.5,
                "description": prediction["description"],
                "createdAt": datetime.now(timezone.utc).isoformat() + "Z",
                "imageUrl": image_url,
                "imageHash": image_hash
            }
        }
        logger.info(f"Prediction completed: {prediction['result']} (confidence: {prediction['confidence']})")
        return jsonify(response), 200
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        return jsonify({"message": str(e), "data": None}), 500