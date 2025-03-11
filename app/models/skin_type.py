import torch
import torchvision.models as models
import torch.nn as nn
import torchvision.transforms as transforms
from PIL import Image
import io
import logging
import requests
import tempfile
import os
from google.cloud import storage
from app.config import Config

logger = logging.getLogger(__name__)

class SkinTypeModel:
    def __init__(self, model_path):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = self._load_model(model_path).to(self.device)
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        self.labels = ["kering", "normal", "berminyak"]
        self.descriptions = {
            "kering": "Kulit Anda tergolong kering. Kulit kering cenderung kurang kelembapan sehingga dapat terlihat kasar atau bersisik, serta sering terasa kencang, terutama setelah mencuci wajah. Penting untuk menjaga hidrasi kulit dengan pelembap yang sesuai.",
            "normal": "Kulit Anda tergolong normal. Kulit normal memiliki keseimbangan kadar minyak dan kelembapan yang ideal, dengan tekstur yang lembut serta jarang mengalami masalah kulit seperti jerawat atau kemerahan.",
            "berminyak": "Kulit Anda tergolong berminyak. Kulit berminyak ditandai dengan produksi sebum (minyak alami kulit) yang berlebihan, yang dapat menyebabkan tampilan mengkilap atau berminyak, terutama di daerah T (dahi, hidung, dan dagu)."
        }

    def _download_from_gcs(self, model_path, temp_path):
        storage_client = storage.Client()
        bucket_name, blob_name = model_path.replace("gs://", "").split("/", 1)
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        blob.download_to_filename(temp_path)
        return temp_path

    def _load_model(self, model_path):
        logger.info(f"Loading model from {model_path}")
        model = models.resnet50(pretrained=False)
        for param in model.parameters():
            param.requires_grad = False
        num_features = model.fc.in_features
        model.fc = nn.Sequential(
            nn.Dropout(0.5),
            nn.Linear(num_features, 3)
        )
        
        try:
            if model_path.startswith("gs://"):
                with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
                    temp_path = self._download_from_gcs(model_path, tmp_file.name)
                    state_dict = torch.load(temp_path, map_location=self.device)
                    os.unlink(temp_path)
            elif model_path.startswith("https://storage.googleapis.com"):
                with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
                    response = requests.get(model_path)
                    response.raise_for_status()
                    tmp_file.write(response.content)
                    state_dict = torch.load(tmp_file.name, map_location=self.device)
                    os.unlink(tmp_file.name)
            else:
                state_dict = torch.load(model_path, map_location=self.device)
                
            state_dict = {k: v for k, v in state_dict.items() if k in model.state_dict()}
            model.load_state_dict(state_dict, strict=False)
        except Exception as e:
            logger.warning(f"Failed to load model weights: {e}. Initializing with random weights.")
            nn.init.xavier_uniform_(model.fc[1].weight)
            nn.init.zeros_(model.fc[1].bias)
        model.eval()
        return model

    def preprocess(self, image_bytes):
        try:
            if len(image_bytes) > Config.MAX_FILE_SIZE:
                raise ValueError("Image size exceeds maximum allowed limit")
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            return self.transform(image).unsqueeze(0).to(self.device)
        except Exception as e:
            logger.error(f"Image preprocessing failed: {e}")
            raise

    def predict(self, image_tensor):
        with torch.no_grad():
            image_tensor = image_tensor.to(self.device)
            outputs = self.model(image_tensor)
            probabilities = torch.nn.functional.softmax(outputs, dim=1)
            top_prob, top_class = torch.topk(probabilities, 1)
            predicted_label = self.labels[top_class.item()]
            return {
                "result": predicted_label,
                "confidence": float(top_prob.item()),
                "description": self.descriptions[predicted_label]
            }

model = SkinTypeModel(Config.MODEL_PATH)