from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.models.weighment import MaterialTolerance
from app.routers.auth import get_current_user, require_role
from app.schemas.auth import UserCreate, UserOut
from app.services.auth import hash_password

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Tolerance schemas ─────────────────────────────────────────────────────────
class ToleranceOut(BaseModel):
    key: str
    label: str
    tolerance: Decimal
    class Config: from_attributes = True

class ToleranceUpdate(BaseModel):
    tolerance: Decimal


@router.get("/tolerances", response_model=list[ToleranceOut])
def list_tolerances(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(MaterialTolerance).order_by(MaterialTolerance.key).all()


@router.put("/tolerances/{key}", response_model=ToleranceOut)
def update_tolerance(
    key: str,
    body: ToleranceUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    row = db.get(MaterialTolerance, key)
    if not row:
        raise HTTPException(404, "Tolerance key not found")
    row.tolerance = body.tolerance
    db.commit()
    db.refresh(row)
    return row


# ── User management ───────────────────────────────────────────────────────────
class UserUpdate(BaseModel):
    role: str
    is_active: bool


class PasswordReset(BaseModel):
    new_password: str


@router.get("/users", response_model=list[UserOut])
def list_all_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    return db.query(User).order_by(User.username).all()


@router.post("/users", response_model=UserOut, status_code=201)
def create_user(
    body: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    if db.query(User).filter_by(username=body.username).first():
        raise HTTPException(400, "Username already exists")
    user = User(
        username=body.username,
        password_hash=hash_password(body.password),
        role=body.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/users/{uid}", response_model=UserOut)
def update_user(
    uid: int,
    body: UserUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(require_role("admin")),
):
    user = db.get(User, uid)
    if not user:
        raise HTTPException(404, "User not found")
    if user.id == current.id and not body.is_active:
        raise HTTPException(400, "Cannot deactivate your own account")
    user.role = body.role
    user.is_active = body.is_active
    db.commit()
    db.refresh(user)
    return user


@router.post("/users/{uid}/reset-password", status_code=200)
def reset_password(
    uid: int,
    body: PasswordReset,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    user = db.get(User, uid)
    if not user:
        raise HTTPException(404, "User not found")
    if len(body.new_password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"message": "Password reset successfully"}
