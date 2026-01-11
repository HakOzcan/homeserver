import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME = "Homeserver API"
    ROOT_PATH = "/api"

    # Database
    DATABASE_URL = (
    f"postgresql://{os.getenv('POSTGRES_USER')}:{os.getenv('POSTGRES_PASSWORD')}"
    f"@{os.getenv('POSTGRES_HOST')}:{os.getenv('POSTGRES_PORT')}/{os.getenv('POSTGRES_DB')}"
)
    # Auth
    SECRET_KEY = os.getenv("SECRET_KEY")
    ALGORITHM = os.getenv("ALGORITHM")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))
    ACTIVATION_TOKEN_EXPIRE_HOURS = int(os.getenv("ACTIVATION_TOKEN_EXPIRE_HOURS"))

    # NEW: email + base url used in verification links
    SMTP_HOST = os.getenv("SMTP_HOST")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER")
    SMTP_PASS = os.getenv("SMTP_PASS")
    SMTP_FROM = os.getenv("SMTP_FROM", os.getenv("SMTP_USER"))
    API_BASE_URL = os.getenv("API_BASE_URL", "https://api.hakserver.cc") 
    FRONTEND_URL = os.getenv("FRONTEND_URL")

settings = Settings()