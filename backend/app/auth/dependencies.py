from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.core.security import verify_access_token
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """@brief Decode JWT and validate that the session is still active."""
    payload = verify_access_token(token) # Decode the token and verify it
    if not payload: # If returns none, raise and exception
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    session_token = payload.get("session_token")
    if not session_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    db_user = db.query(User).filter(User.id == payload["sub"]).first()
    if not db_user or db_user.session_token != session_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session invalidated. You have been logged in from another location.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload # Otherwise, return the payload

def require_active_user(user=Depends(get_current_user), db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.id == user["sub"]).first()
    if not db_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account not active."
        )
    return db_user

def require_admin(user=Depends(require_active_user)):
    if not user or not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin only")
    return user