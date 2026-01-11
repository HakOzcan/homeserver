from fastapi import APIRouter, HTTPException, status, Depends, Request, Response
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.core.security import create_access_token, create_activation_token, verify_activation_token, extract_email_from_expired_token
from app.db.database import get_db
from app.db.models import User
from app.db import schemas
from app.auth.dependencies import get_current_user, require_active_user, require_admin
from app.auth.validators import validate_password_strength
from app.core.config import settings
from app.core.email_utils import send_email
from datetime import datetime, timedelta, timezone

RESEND_COOLDOWN_SECONDS = 120

router = APIRouter(prefix="/auth", tags=["auth"])

# Hold password context for bcrpyt scheme
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@router.post("/register")
def register(request: schemas.UserCreate, db: Session = Depends(get_db)): # Try getting usercreate schema and current session
    existing_user = db.query(User).filter(User.email == request.email.lower()).first() # Check if there is any user with the requested username
    if existing_user: # If so, raise an exception 
        raise HTTPException(status_code=400, detail="Email already exists")

    # Validate password if it fits with complexity rules
    validate_password_strength(request.password)

    # Hash requested password
    hashed_pw = pwd_context.hash(request.password)

    # Create the new user using requested email, username and hashed password
    new_user = User(
        email=request.email.lower(),
        username=request.username, 
        hashed_password=hashed_pw,
        is_admin=False,
        is_active=False,
        email_verified=False,
    )

    # Add it to database
    db.add(new_user)

    # Commit the changes
    db.commit()

    # Refresh the database with new user
    db.refresh(new_user)

    verify_url = f"{settings.FRONTEND_URL}/verify?token={create_activation_token(new_user.email)}"

    try:
        send_email(
            to_email=new_user.email,
            subject="Verify Your Email",
            html_body=f"""
                <p>Hello {new_user.username},</p>
                <p>Please verify your email to complete registration:</p>
                <p><a href="{verify_url}">Verify Your Email</a></p>
                <p>This link expires in 24 hours.</p>
            """,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send verification email: {e}")
    
    new_user.last_verification_email_sent_at = datetime.now(timezone.utc)
    db.commit()

    return {"message": "Registration request received. Please confirm your email address using activation email to activate your account."}

@router.post("/resend-verification")
def resend_verification_email(token: str, db: Session = Depends(get_db), response: Response = None):
    email = extract_email_from_expired_token(token)

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.email_verified:
        raise HTTPException(
            status_code=409,
            detail="Your email has been already verified."
        )
    
    now = datetime.now(timezone.utc)

    # ✅ Cooldown check
    if user.last_verification_email_sent_at:
        elapsed = (now - user.last_verification_email_sent_at).total_seconds()
        if elapsed < RESEND_COOLDOWN_SECONDS:
            wait = int(RESEND_COOLDOWN_SECONDS - elapsed)

            if response:
                response.headers["Retry-After"] = str(wait)

            raise HTTPException(
                status_code=429,
                detail=f"Please wait {wait} seconds before resending."
            )

    verify_url = f"{settings.FRONTEND_URL}/verify?token={create_activation_token(user.email)}"

    try:
        send_email(
            to_email=user.email,
            subject="Verify Your Email",
            html_body=f"""
                <p>Hello {user.username},</p>
                <p>Please verify your email to complete registration:</p>
                <p><a href="{verify_url}">Verify Your Email</a></p>
                <p>This link expires in 24 hours.</p>
            """,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send verification email: {e}")
    
    # ✅ Update timestamp ONLY after successful send
    user.last_verification_email_sent_at = now
    db.commit()

    return {"message": "Verification link re-sent."}

@router.get("/password-policy")
def get_password_policy():
    from app.auth.validators import PASSWORD_POLICY
    return PASSWORD_POLICY

@router.get("/verify")
def verify_email(token: str, db: Session = Depends(get_db)):
    email = verify_activation_token(token)

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.email_verified:
        raise HTTPException(status_code=409, detail="Your email has been already verified.")

    user.email_verified = True
    db.commit()
    return {"message": "Email verified.", "email_verified": user.email_verified, "is_active": user.is_active}

@router.post("/login")
def login(request: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email.lower()).first() # Check if request's username is in our database and get and assign it to a variable if so
    if not user or not pwd_context.verify(request.password, user.hashed_password): # Validate user and the request's password, if they are not correct, raise an exception
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # gates
    if not user.email_verified:
        raise HTTPException(status_code=403, detail="Email not verified")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account pending admin approval")

    # Create an access token and return it as the credentials are valid
    access_token = create_access_token({"sub": str(user.id), "email": user.email, "username": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@router.delete("/delete")
def delete(user = Depends(get_current_user), db: Session = Depends(get_db)):
    # Delete the currently logged-in user
    id = user["sub"]
    username = user["username"]
    db_user = db.query(User).filter(User.id == id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(db_user)
    db.commit()
    return {"message": f"User '{username}' has been deleted."}