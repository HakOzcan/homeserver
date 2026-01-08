from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.core.security import verify_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = verify_access_token(token) # Decode the token and verify it
    if not payload: # If returns none, raise and exception
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload # Otherwise, return the payload

def require_active_user(user=Depends(get_current_user)):
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account not active."
        )
    return user

def require_admin(user=Depends(require_active_user)):
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin only.")
    return user