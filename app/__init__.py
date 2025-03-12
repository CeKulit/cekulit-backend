from flask import Flask
from flask_swagger_ui import get_swaggerui_blueprint
from app.routes.predict import predict_bp
from app.config import get_config
import logging

def create_app():
    app = Flask(__name__, template_folder='../templates', static_folder='../static')
    config = get_config()
    
    # Setup logging dengan format yang lebih baik
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
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
    
    # Log startup
    logging.getLogger(__name__).info("Application started with FLASK_ENV=%s", config.FLASK_ENV)
    
    return app