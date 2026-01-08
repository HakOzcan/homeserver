from pydantic import BaseModel, EmailStr, Field

# ----------------------------
# User Schemas
# ----------------------------

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    is_admin: bool
    is_active: bool
    email_verified: bool

    class Config:
        from_attributes = True
