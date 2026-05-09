from datetime import date

from app.services.dc_number import _financial_year

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.delivery import Delivery
from app.models.user import User
from app.models.weighment import IngredientLabel, WeighmentRecord, WeighmentSequence
from app.routers.auth import get_current_user, require_role
from app.schemas.weighment import (
    IngredientLabelOut, IngredientLabelUpdate,
    WeighmentCreate, WeighmentOut,
)

router = APIRouter(tags=["weighment"])


# ── Ticket number generator — resets every fiscal year (Apr–Mar) ──────────────

def _next_ticket(db: Session, weigh_date: date) -> str:
    fy = _financial_year(weigh_date)
    seq = (
        db.execute(
            select(WeighmentSequence)
            .where(WeighmentSequence.year_code == fy)
            .with_for_update()
        ).scalar_one_or_none()
    )
    if seq is None:
        seq = WeighmentSequence(year_code=fy, last_number=0)
        db.add(seq)
        db.flush()
    seq.last_number += 1
    db.flush()
    return f"SARMC/{fy}/WGH/{seq.last_number:04d}"


# ── Weighment CRUD ─────────────────────────────────────────────────────────────

@router.get("/weighments", response_model=list[WeighmentOut])
def list_weighments(
    type: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(WeighmentRecord).order_by(WeighmentRecord.weigh_date.desc(), WeighmentRecord.id.desc())
    if type:
        q = q.filter(WeighmentRecord.type == type.upper())
    if date_from:
        q = q.filter(WeighmentRecord.weigh_date >= date_from)
    if date_to:
        q = q.filter(WeighmentRecord.weigh_date <= date_to)

    rows = q.limit(limit).all()
    result = []
    for r in rows:
        out = WeighmentOut.model_validate(r)
        if r.delivery_id:
            d = db.get(Delivery, r.delivery_id)
            out.dc_number = d.dc_number if d else None
        result.append(out)
    return result


@router.post("/weighments", response_model=WeighmentOut, status_code=201)
def create_weighment(
    body: WeighmentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if body.type.upper() not in ("INWARD", "OUTWARD"):
        raise HTTPException(400, "type must be INWARD or OUTWARD")
    if body.delivery_id:
        if not db.get(Delivery, body.delivery_id):
            raise HTTPException(404, "Delivery not found")

    net = body.gross_weight_kg - body.tare_weight_kg
    ticket = _next_ticket(db, body.weigh_date)

    rec = WeighmentRecord(
        ticket_number=ticket,
        type=body.type.upper(),
        delivery_id=body.delivery_id,
        vehicle_number=body.vehicle_number,
        driver_name=body.driver_name,
        material_description=body.material_description,
        supplier=body.supplier,
        gross_weight_kg=body.gross_weight_kg,
        tare_weight_kg=body.tare_weight_kg,
        net_weight_kg=net,
        weigh_date=body.weigh_date,
        weigh_time=body.weigh_time,
        remarks=body.remarks,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    out = WeighmentOut.model_validate(rec)
    return out


@router.get("/weighments/{wid}", response_model=WeighmentOut)
def get_weighment(wid: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    rec = db.get(WeighmentRecord, wid)
    if not rec:
        raise HTTPException(404, "Weighment record not found")
    out = WeighmentOut.model_validate(rec)
    if rec.delivery_id:
        d = db.get(Delivery, rec.delivery_id)
        out.dc_number = d.dc_number if d else None
    return out


@router.delete("/weighments/{wid}", status_code=204)
def delete_weighment(wid: int, db: Session = Depends(get_db), _: User = Depends(require_role("admin", "supervisor"))):
    rec = db.get(WeighmentRecord, wid)
    if not rec:
        raise HTTPException(404, "Weighment record not found")
    db.delete(rec)
    db.commit()


# ── Ingredient Labels ──────────────────────────────────────────────────────────

@router.get("/ingredient-labels", response_model=list[IngredientLabelOut])
def get_ingredient_labels(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(IngredientLabel).order_by(IngredientLabel.sort_order).all()


@router.put("/ingredient-labels/{key}", response_model=IngredientLabelOut)
def update_ingredient_label(
    key: str,
    body: IngredientLabelUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    lbl = db.get(IngredientLabel, key)
    if not lbl:
        raise HTTPException(404, "Ingredient not found")
    lbl.label = body.label.strip()
    db.commit()
    db.refresh(lbl)
    return lbl
