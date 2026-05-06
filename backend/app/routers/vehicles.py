from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.vehicle import Driver, Vehicle
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.vehicle import (
    DriverCreate, DriverOut, DriverUpdate,
    VehicleCreate, VehicleOut, VehicleUpdate,
)

router = APIRouter(tags=["vehicles-drivers"])


# ── Vehicles ───────────────────────────────────────────────────────────────────

@router.get("/vehicles", response_model=list[VehicleOut])
def list_vehicles(active_only: bool = True, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    q = db.query(Vehicle)
    if active_only:
        q = q.filter(Vehicle.is_active == True)
    return q.order_by(Vehicle.vehicle_number).all()


@router.post("/vehicles", response_model=VehicleOut, status_code=201)
def create_vehicle(body: VehicleCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    if db.query(Vehicle).filter_by(vehicle_number=body.vehicle_number).first():
        raise HTTPException(400, "Vehicle number already exists")
    v = Vehicle(**body.model_dump())
    db.add(v)
    db.commit()
    db.refresh(v)
    return v


@router.put("/vehicles/{vid}", response_model=VehicleOut)
def update_vehicle(vid: int, body: VehicleUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    v = db.query(Vehicle).filter_by(id=vid).first()
    if not v:
        raise HTTPException(404, "Vehicle not found")
    for k, val in body.model_dump().items():
        setattr(v, k, val)
    db.commit()
    db.refresh(v)
    return v


@router.delete("/vehicles/{vid}", status_code=204)
def delete_vehicle(vid: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    v = db.query(Vehicle).filter_by(id=vid).first()
    if not v:
        raise HTTPException(404, "Vehicle not found")
    v.is_active = False
    db.commit()


# ── Drivers ────────────────────────────────────────────────────────────────────

@router.get("/drivers", response_model=list[DriverOut])
def list_drivers(active_only: bool = True, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    q = db.query(Driver)
    if active_only:
        q = q.filter(Driver.is_active == True)
    return q.order_by(Driver.name).all()


@router.post("/drivers", response_model=DriverOut, status_code=201)
def create_driver(body: DriverCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    d = Driver(**body.model_dump())
    db.add(d)
    db.commit()
    db.refresh(d)
    return d


@router.put("/drivers/{did}", response_model=DriverOut)
def update_driver(did: int, body: DriverUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    d = db.query(Driver).filter_by(id=did).first()
    if not d:
        raise HTTPException(404, "Driver not found")
    for k, val in body.model_dump().items():
        setattr(d, k, val)
    db.commit()
    db.refresh(d)
    return d


@router.delete("/drivers/{did}", status_code=204)
def delete_driver(did: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    d = db.query(Driver).filter_by(id=did).first()
    if not d:
        raise HTTPException(404, "Driver not found")
    d.is_active = False
    db.commit()
