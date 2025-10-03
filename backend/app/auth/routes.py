from fastapi import APIRouter, HTTPException, status, Depends
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.core.security import create_access_token
from app.db.database import get_db
from app.db.models import User
from app.db import schemas

router = APIRouter(prefix="/auth", tags=["auth"])

# Hold password context for bcrpyt scheme
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@router.post("/register", response_model=schemas.UserResponse)
def register(request: schemas.UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.username == request.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")

    hashed_pw = pwd_context.hash(request.password)
    new_user = User(username=request.username, hashed_password=hashed_pw)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login")
def login(request: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == request.username).first() # Check if request's username is in our fake database and get and assign it to a variable if so
    if not user or not pwd_context.verify(request.password, user.hashed_password): # Validate user and the request's password, if they are not correct, raise an exception
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create an access token and return it as the credentials are valid
    access_token = create_access_token({"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}