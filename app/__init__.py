from flask import Flask
from flask_swagger_ui import get_swaggerui_blueprint
from app.routes.predict import predict_bp
from app.config import Config
import logging

def create_app():
    app = Flask(__name__)
    
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    
    # Register blueprint
    app.register_blueprint(predict_bp)
    
    # Swagger UI
    SWAGGER_URL = "/docs"
    API_URL = "/static/swagger.json"
    swaggerui_blueprint = get_swaggerui_blueprint(
        SWAGGER_URL, API_URL, config={"app_name": "Skin Type Prediction API"}
    )
    app.register_blueprint(swaggerui_blueprint, url_prefix=SWAGGER_URL)
    
    return app