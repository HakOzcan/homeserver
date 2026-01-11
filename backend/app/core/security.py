from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from .config import settings

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    # Get data copied to a placeholder
    to_encode = data.copy()

    # Get the expiration time (now + 60 mins)
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))

    # Update expiration time with newly calculated one
    to_encode.update({"exp": expire})

    # Encode it with key and algorithm and return it
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_access_token(token: str):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]) # Decode the payload with key and algorithm and return it 
        return payload # Contains "sub" (id) and other claims
    except JWTError: # Return none if cannot decode it properly
        return None

def create_activation_token(email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.ACTIVATION_TOKEN_EXPIRE_HOURS)
    payload = {
        "sub": email,
        "type": "activation",
        "exp": expire,
    }
    encoded_activation_token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_activation_token

def verify_activation_token(token:str) -> str:
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=settings.ALGORITHM)
    if payload.get("type") != "activation":
        raise ValueError("Invalid token type")
    email = payload.get("sub")
    if not email:
        raise ValueError("Missing Subject")
    return email

def extract_email_from_expired_token(token:str) -> str:
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=settings.ALGORITHM, options={"verify_exp": False})
    if payload.get("type") != "activation":
        raise ValueError("Invalid token type")
    email = payload.get("sub")
    if not email:
        raise ValueError("Missing Subject")
    return email


