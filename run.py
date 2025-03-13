from app import create_app
import os
from app.config import Config

app = create_app()

if __name__ == '__main__':
    port = int(os.getenv('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=Config.FLASK_ENV == "development")