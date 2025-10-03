from pydantic import BaseModel

# ----------------------------
# User Schemas
# ----------------------------

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class UserLogin(UserBase):
    password: str

class UserResponse(UserBase):
    id: int

    class Config:
        orm_mode = True  # allow SQLAlchemy models to be returned directly
