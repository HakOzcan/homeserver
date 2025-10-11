import re, json, os
from fastapi import HTTPException, status

password_policy_path = os.path.join(os.path.dirname(__file__), "../config/password_policy.json")

with open(password_policy_path, "r") as f:
    PASSWORD_POLICY = json.load(f)

def validate_password_strength(password: str):
    """
    Enforce password policy
    """
    for rule in PASSWORD_POLICY["rules"]:
        if not re.search(rule["regex"], password):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Password must include: {rule['label']}")
