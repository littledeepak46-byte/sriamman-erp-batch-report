from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, extract
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.customer import Customer, CustomerSite
from app.models.delivery import Delivery
from app.models.material import MaterialGrade
from app.models.sequence import DCSequence, BatchSequence
from app.models.weighment import WeighmentSequence
from app.models.user import User
from app.models.vehicle import Vehicle
from app.routers.auth import get_current_user, require_role
from pydantic import BaseModel


router = APIRouter(prefix="/reports", tags=["reports"])


# ── Response models ────────────────────────────────────────────────────────────

class MonthlydcRow(BaseModel):
    dc_number: str
    delivery_date: date
    customer_name: str | None
    grade_name: str | None
    plant_type: str | None
    quantity_m3: Decimal
    vehicle_number: str | None


class CumulativeRow(BaseModel):
    customer_name: str
    site_name: str | None
    grade_name: str | None
    delivery_date: date
    total_qty_m3: float
    delivery_count: int


class DcSequenceRow(BaseModel):
    year_code: str
    month_code: str
    last_number: int
    preview: str   # formatted last DC number for that month


class BatchSequenceRow(BaseModel):
    plant_type: str
    last_batch_number: int


# ── Monthly DC Audit ───────────────────────────────────────────────────────────

@router.get("/monthly-dc", response_model=list[MonthlydcRow])
def monthly_dc(
    year: int = Query(...),
    month: int = Query(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = (
        db.query(Delivery)
        .filter(
            extract("year", Delivery.delivery_date) == year,
            extract("month", Delivery.delivery_date) == month,
        )
        .order_by(Delivery.dc_number)
        .all()
    )

    result = []
    for d in rows:
        customer = db.get(Customer, d.customer_id)
        grade = db.get(MaterialGrade, d.grade_id)
        vehicle = db.get(Vehicle, d.vehicle_id)
        result.append(MonthlydcRow(
            dc_number=d.dc_number,
            delivery_date=d.delivery_date,
            customer_name=customer.name if customer else None,
            grade_name=grade.grade_name if grade else None,
            plant_type=d.plant_type,
            quantity_m3=d.quantity_m3,
            vehicle_number=vehicle.vehicle_number if vehicle else None,
        ))
    return result


# ── Cumulative Summary ─────────────────────────────────────────────────────────

@router.get("/cumulative", response_model=list[CumulativeRow])
def cumulative_summary(
    date_from: date = Query(...),
    date_to: date = Query(...),
    customer_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = (
        db.query(
            Delivery.customer_id,
            Delivery.site_id,
            Delivery.grade_id,
            Delivery.delivery_date,
            func.sum(Delivery.quantity_m3).label("total_qty"),
            func.count(Delivery.id).label("cnt"),
        )
        .filter(
            Delivery.delivery_date >= date_from,
            Delivery.delivery_date <= date_to,
        )
        .group_by(
            Delivery.customer_id,
            Delivery.site_id,
            Delivery.grade_id,
            Delivery.delivery_date,
        )
        .order_by(Delivery.delivery_date.desc(), Delivery.customer_id)
    )
    if customer_id:
        q = q.filter(Delivery.customer_id == customer_id)

    result = []
    for row in q.all():
        customer = db.get(Customer, row.customer_id)
        site = db.get(CustomerSite, row.site_id)
        grade = db.get(MaterialGrade, row.grade_id)
        result.append(CumulativeRow(
            customer_name=customer.name if customer else "",
            site_name=site.site_name if site else None,
            grade_name=grade.grade_name if grade else None,
            delivery_date=row.delivery_date,
            total_qty_m3=round(float(row.total_qty), 3),
            delivery_count=row.cnt,
        ))
    return result


# ── Sequence Status ────────────────────────────────────────────────────────────

@router.get("/sequences/dc", response_model=list[DcSequenceRow])
def dc_sequences(db: Session = Depends(get_db), _: User = Depends(require_role("admin", "supervisor"))):
    rows = db.query(DCSequence).order_by(DCSequence.year_code.desc(), DCSequence.month_code).all()
    return [
        DcSequenceRow(
            year_code=r.year_code,
            month_code=r.month_code,
            last_number=r.last_number,
            preview=f"SARMC/{r.year_code}/{r.month_code}/{r.last_number:04d}",
        )
        for r in rows
    ]


@router.get("/sequences/batch", response_model=list[BatchSequenceRow])
def batch_sequences(db: Session = Depends(get_db), _: User = Depends(require_role("admin", "supervisor"))):
    return db.query(BatchSequence).order_by(BatchSequence.plant_type).all()


class WeighmentSequenceRow(BaseModel):
    year_code: str
    last_number: int
    preview: str   # formatted last ticket for that year


@router.get("/sequences/weighment", response_model=list[WeighmentSequenceRow])
def weighment_sequences(db: Session = Depends(get_db), _: User = Depends(require_role("admin", "supervisor"))):
    rows = db.query(WeighmentSequence).order_by(WeighmentSequence.year_code.desc()).all()
    return [
        WeighmentSequenceRow(
            year_code=r.year_code,
            last_number=r.last_number,
            preview=f"WGH-{r.last_number:05d}",
        )
        for r in rows
    ]
