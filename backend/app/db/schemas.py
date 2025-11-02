from pydantic import BaseModel, EmailStr, Field

# ----------------------------
# User Schemas
# ----------------------------

class UserBase(BaseModel):
    email: EmailStr
    id: int

class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)
    username: str | None = None

class UserLogin(UserBase):
    password: str

class UserResponse(UserBase):
    username: str | None = None

    class Config:
        orm_mode = True  # allow SQLAlchemy models to be returned directly
