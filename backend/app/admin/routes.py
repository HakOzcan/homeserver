from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.auth.dependencies import require_admin
from app.db.database import get_db
from app.db.models import User
from app.core.email_utils import send_email
from app.core.config import settings

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/pending-users")
def pending_users(admin=Depends(require_admin), db: Session = Depends(get_db)):
    users = (
        db.query(User)
        .filter(User.email_verified == True)
        .filter(User.is_active == False)
        .order_by(User.id.desc())
        .all()
    )
    return {
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "username": u.username,
                "email_verified": u.email_verified,
                "is_active": u.is_active
            }
            for u in users
        ]
    }

@router.post("/approve/{user_id}")
def approve_user(user_id: int, admin=Depends(require_admin), db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not u.email_verified:
        raise HTTPException(status_code=400, detail="User email not verified")
    
    u.is_active = True
    db.commit()

    try:
        send_email(
            to_email=u.email,
            subject="Your Account Approved",
            html_body=f"""
                <p>Hello {u.username},</p>
                <p>Your account has been approved by an admin! You can now access to your account using below link.</p>
                <p><a href="{settings.FRONTEND_URL}">HakServer</a></p>
            """,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send verification email: {e}")
    
    return {"message": "User apporved"}

@router.post("/reject/{user_id}")
def reject_user(user_id: int, admin=Depends(require_admin), db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(u)
    db.commit()

    return {"message": "User rejected and deleted"}