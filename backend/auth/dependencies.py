from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from .authutils import verify_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = verify_access_token(token) # Decode the token and verify it
    if not payload: # If returns none, raise and exception
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            details="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload # Otherwise, return the payload