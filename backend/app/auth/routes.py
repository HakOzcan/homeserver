from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from passlib.context import CryptContext
from .auth_utils import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])

# Store a fake user info for now
fake_user_db = {
    "hakan": {
        "username": "hakan",
        "hashed_password": "$2b$12$F6nhUfA6OLNk7zT1ZxXAAe3tGnC49bCmWnVUXu.lHKU7QG7aG3EPC" # bcrypt for "password123"
    }
}

# Hold password context for bcrpyt scheme
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Class for login request
class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login")
def login(request: LoginRequest):
    user = fake_user_db.get(request.username) # Check if request's username is in our fake database and get and assign it to a variable if so
    if not user or not pwd_context.verify(request.password, user["hashed_password"]): # Validate user and the request's password, if they are not correct, raise an exception
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            details="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create an access token and return it as the credentials are valid
    access_token = create_access_token({"sub": request.username})
    return {"access_token": access_token, "token_type": "bearer"}