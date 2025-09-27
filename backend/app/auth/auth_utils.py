from datetime import datetime, timedelta
from jose import JWTError, jwt

# Config
SECRET_KEY = "supersecretkey" # Needs to be moved to env var
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    # Get data copied to a placeholder
    to_encode = data.copy()

    # Get the expiration time (now + 60 mins)
    expire = datetime.now() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))

    # Update expiration time with newly calculated one
    to_encode.update({"exp": expire})

    # Encode it with key and algorithm and return it
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_access_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM]) # Decode the payload with key and algorithm and return it 
        return payload # Contains "sub" (username) and other claims
    except JWTError: # Return none if cannot decode it properly
        return None