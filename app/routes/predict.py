from flask import request, jsonify, render_template
from .models import load_model, preprocess_image, predict_skin_type
from .storage import upload_to_gcs
from .utils import allowed_file, validate_file_size
from .config import Config
import uuid
from datetime import datetime

model = load_model(Config.MODEL_PATH)

def setup_routes(app):
    @app.route('/')
    def index():
        return render_template('index.html')

    @app.route('/predict', methods=['POST'])
    def predict():
        if 'photo' not in request.files:
            return jsonify({"message": "No file uploaded.", "data": None}), 400
        file = request.files['photo']
        if file.filename == '':
            return jsonify({"message": "No selected file.", "data": None}), 400
        try:
            validate_file_size(file)
            if not allowed_file(file.filename):
                raise ValueError("Invalid file type. Only JPG, JPEG, and PNG are allowed.")
            img_bytes = file.read()
            image_tensor = preprocess_image(img_bytes)
            predicted_class, confidence = predict_skin_type(model, image_tensor)
            skin_type_labels = ['kering', 'normal', 'berminyak']
            predicted_label = skin_type_labels[predicted_class]
            prediction_id = str(uuid.uuid4()).replace('-', '_')
            filename = f"{prediction_id}_{file.filename}"
            image_url = upload_to_gcs(img_bytes, filename)
            response = {
                "message": "Model predicted successfully.",
                "data": {
                    "id": prediction_id,
                    "result": predicted_label,
                    "confidenceScore": confidence,
                    "isAboveThreshold": confidence > 0.5,
                    "createdAt": datetime.utcnow().isoformat() + "Z",
                    "imageUrl": image_url
                }
            }
            return jsonify(response), 200
        except Exception as e:
            return jsonify({"message": str(e), "data": None}), 500