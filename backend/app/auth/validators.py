import re
from fastapi import HTTPException, status

PASSWORD_RULES = "Password must be at least 8 characters long, include an uppercase and a lowercase letter, a number and a special character!"

def validate_password_strength(password: str):
    """
    Enforce password policy:
    - At least 8 characters
    - At least one uppercase, one lowercase, one digit, one special character
    """
    if len(password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=PASSWORD_RULES)
    if not re.search(r"[A-Z]", password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=PASSWORD_RULES)
    if not re.search(r"[a-z]", password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=PASSWORD_RULES)
    if not re.search(r"\d", password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=PASSWORD_RULES)
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=PASSWORD_RULES)
