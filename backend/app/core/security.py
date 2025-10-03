from datetime import datetime, timedelta
from jose import JWTError, jwt
from .config import settings

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    # Get data copied to a placeholder
    to_encode = data.copy()

    # Get the expiration time (now + 60 mins)
    expire = datetime.now() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))

    # Update expiration time with newly calculated one
    to_encode.update({"exp": expire})

    # Encode it with key and algorithm and return it
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_access_token(token: str):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]) # Decode the payload with key and algorithm and return it 
        return payload # Contains "sub" (username) and other claims
    except JWTError: # Return none if cannot decode it properly
        return None
