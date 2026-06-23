import os

class Settings:
    PROJECT_NAME: str = "LostAI Matching Engine"
    VERSION: str = "1.0.0"
    
    # Storage settings
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
    API_BASE_URL: str = os.getenv("API_BASE_URL", "http://localhost:8000")
    
    # Model settings
    MODEL_NAME: str = "resnet18"
    
    # CORS settings
    ALLOWED_ORIGINS: list = os.getenv(
        "ALLOWED_ORIGINS", 
        "http://localhost:4200,http://localhost:8000,http://localhost"
    ).split(",")

# Ensure upload directory exists
os.makedirs(Settings.UPLOAD_DIR, exist_ok=True)

settings = Settings()
