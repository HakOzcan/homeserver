import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME = "Homeserver API"
    ROOT_PATH = "/api"

    # Database
    DATABASE_URL = os.getenv("DATABASE_URL")

    # Auth
    SECRET_KEY = os.getenv("SECRET_KEY")
    ALGORITHM = os.getenv("ALGORITHM")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))

settings = Settings()