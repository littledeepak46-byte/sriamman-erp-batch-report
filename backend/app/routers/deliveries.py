from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.customer import Customer, CustomerSite
from app.models.delivery import Delivery
from app.models.design_mix import DesignMix
from app.models.material import MaterialGrade, MaterialType, PumpingType
from app.models.user import User
from app.models.vehicle import Driver, Vehicle
from app.routers.auth import get_current_user
from app.models.delivery import BatchReportActual
from app.schemas.delivery import (
    CumulativeQtyRequest, DeliveryCreate, DeliveryOut, DeliveryStats,
)
from app.schemas.print_data import (
    BatchActualRow, BatchActualsSave, BatchActualRow as BAR,
    DesignMixPrint, PrintDataOut,
)
from app.services.batch_number import generate_batch_number
from app.services.cumulative import get_cumulative_qty
from app.services.dc_number import generate_dc_number

router = APIRouter(prefix="/deliveries", tags=["deliveries"])


def _enrich(d: Delivery, db: Session) -> DeliveryOut:
    out = DeliveryOut.model_validate(d)
    if c := db.get(Customer, d.customer_id):
        out.customer_name = c.name
    if s := db.get(CustomerSite, d.site_id):
        out.site_name = s.site_name
    if mt := db.get(MaterialType, d.material_type_id):
        out.material_name = mt.name
    if g := db.get(MaterialGrade, d.grade_id):
        out.grade_name = g.grade_name
    if d.pumping_type_id and (pt := db.get(PumpingType, d.pumping_type_id)):
        out.pumping_name = pt.name
    if v := db.get(Vehicle, d.vehicle_id):
        out.vehicle_number = v.vehicle_number
    if dr := db.get(Driver, d.driver_id):
        out.driver_name = dr.name
    return out


@router.post("/cumulative-qty")
def calc_cumulative(body: CumulativeQtyRequest, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    total = get_cumulative_qty(
        db,
        customer_id=body.customer_id,
        site_id=body.site_id,
        grade_id=body.grade_id,
        plant_type=body.plant_type,
        delivery_date=body.delivery_date,
        current_qty=body.quantity_m3,
        exclude_delivery_id=body.exclude_delivery_id,
    )
    return {"cumulative_qty_m3": float(total)}


@router.post("", response_model=DeliveryOut, status_code=201)
def create_delivery(body: DeliveryCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vehicle = db.get(Vehicle, body.vehicle_id)
    if not vehicle:
        raise HTTPException(404, "Vehicle not found")

    site = db.get(CustomerSite, body.site_id)
    if not site:
        raise HTTPException(404, "Site not found")

    # Look up design mix for batch report (per customer + grade, same mix for both plants)
    design_mix_id = None
    if body.plant_type in ("M1.25", "CP30"):
        dm = (
            db.query(DesignMix)
            .filter_by(customer_id=body.customer_id, grade_id=body.grade_id)
            .filter(DesignMix.valid_to == None)  # noqa: E711
            .order_by(DesignMix.version.desc())
            .first()
        )
        if dm:
            design_mix_id = dm.id

    cumulative = get_cumulative_qty(
        db,
        customer_id=body.customer_id,
        site_id=body.site_id,
        grade_id=body.grade_id,
        plant_type=body.plant_type,
        delivery_date=body.delivery_date,
        current_qty=body.quantity_m3,
    )

    empty_weight = vehicle.empty_weight_kg
    net_weight = (
        Decimal(str(body.gross_weight_kg)) - Decimal(str(empty_weight))
        if body.gross_weight_kg else None
    )

    # All sequence operations inside one transaction
    dc_number = generate_dc_number(db, body.delivery_date)
    batch_number = generate_batch_number(db, body.plant_type) if body.plant_type in ("M1.25", "CP30") else None

    delivery = Delivery(
        dc_number=dc_number,
        batch_number=batch_number,
        customer_id=body.customer_id,
        site_id=body.site_id,
        plant_type=body.plant_type,
        material_type_id=body.material_type_id,
        grade_id=body.grade_id,
        pumping_type_id=body.pumping_type_id,
        quantity_m3=body.quantity_m3,
        cumulative_qty_m3=cumulative,
        vehicle_id=body.vehicle_id,
        driver_id=body.driver_id,
        delivery_date=body.delivery_date,
        delivery_time=body.delivery_time,
        site_location=site.city,
        gross_weight_kg=body.gross_weight_kg,
        empty_weight_kg=empty_weight,
        net_weight_kg=net_weight,
        design_mix_id=design_mix_id,
        created_by=current_user.id,
    )
    db.add(delivery)
    db.commit()
    db.refresh(delivery)
    return _enrich(delivery, db)


@router.get("/stats", response_model=DeliveryStats)
def get_stats(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    today = date.today()
    month_start = today.replace(day=1)

    today_count = db.query(func.count(Delivery.id)).filter(Delivery.delivery_date == today).scalar() or 0
    monthly_m3 = float(db.query(func.sum(Delivery.quantity_m3)).filter(Delivery.delivery_date >= month_start).scalar() or 0)
    active_vehicles = db.query(func.count(Vehicle.id)).filter(Vehicle.is_active == True).scalar() or 0
    dc_this_month = db.query(func.count(Delivery.id)).filter(Delivery.delivery_date >= month_start).scalar() or 0

    return DeliveryStats(
        today_count=today_count,
        monthly_m3=round(monthly_m3, 2),
        active_vehicles=active_vehicles,
        dc_this_month=dc_this_month,
    )


@router.get("", response_model=list[DeliveryOut])
def list_deliveries(
    limit: int = Query(20, le=200),
    offset: int = 0,
    customer_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    dc_number: str | None = None,
    grade_id: int | None = None,
    plant_type: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Delivery).order_by(Delivery.delivery_date.desc(), Delivery.id.desc())
    if customer_id:
        q = q.filter(Delivery.customer_id == customer_id)
    if date_from:
        q = q.filter(Delivery.delivery_date >= date_from)
    if date_to:
        q = q.filter(Delivery.delivery_date <= date_to)
    if dc_number:
        q = q.filter(Delivery.dc_number.ilike(f"%{dc_number}%"))
    if grade_id:
        q = q.filter(Delivery.grade_id == grade_id)
    if plant_type:
        q = q.filter(Delivery.plant_type == plant_type)
    return [_enrich(d, db) for d in q.offset(offset).limit(limit).all()]


@router.get("/{delivery_id}", response_model=DeliveryOut)
def get_delivery(delivery_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    d = db.get(Delivery, delivery_id)
    if not d:
        raise HTTPException(404, "Delivery not found")
    return _enrich(d, db)


@router.get("/{delivery_id}/print-data", response_model=PrintDataOut)
def get_print_data(delivery_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    d = db.get(Delivery, delivery_id)
    if not d:
        raise HTTPException(404, "Delivery not found")

    customer = db.get(Customer, d.customer_id)
    site = db.get(CustomerSite, d.site_id)
    vehicle = db.get(Vehicle, d.vehicle_id)
    driver = db.get(Driver, d.driver_id)
    mat = db.get(MaterialType, d.material_type_id)
    grade = db.get(MaterialGrade, d.grade_id)
    pumping = db.get(PumpingType, d.pumping_type_id) if d.pumping_type_id else None

    billing = ", ".join(filter(None, [
        customer.billing_address_line1 if customer else None,
        customer.billing_address_line2 if customer else None,
        customer.billing_city if customer else None,
        customer.billing_state if customer else None,
        customer.billing_pincode if customer else None,
    ])) if customer else None

    site_full = ", ".join(filter(None, [
        site.door_no, site.street1, site.street2, site.city, site.state, site.pincode
    ])) if site else None

    # Design mix
    dm_out = None
    if d.design_mix_id:
        dm = db.get(DesignMix, d.design_mix_id)
        if dm:
            dm_out = DesignMixPrint.model_validate(dm)
            dm_out.customer_name = customer.name if customer else None
            dm_out.grade_name = grade.grade_name if grade else None

    # Batch actuals
    actuals_db = (
        db.query(BatchReportActual)
        .filter_by(delivery_id=delivery_id)
        .order_by(BatchReportActual.batch_sequence)
        .all()
    )
    actuals_out = [BatchActualRow.model_validate(a) for a in actuals_db]

    return PrintDataOut(
        id=d.id,
        dc_number=d.dc_number,
        batch_number=d.batch_number,
        customer_name=customer.name if customer else "",
        customer_gst=customer.gst_number if customer else None,
        billing_address=billing,
        site_name=site.site_name if site else None,
        site_location=d.site_location,
        site_full_address=site_full,
        plant_type=d.plant_type,
        material_name=mat.name if mat else None,
        grade_name=grade.grade_name if grade else None,
        pumping_name=pumping.name if pumping else None,
        quantity_m3=d.quantity_m3,
        cumulative_qty_m3=d.cumulative_qty_m3,
        vehicle_number=vehicle.vehicle_number if vehicle else None,
        empty_weight_kg=d.empty_weight_kg,
        driver_name=driver.name if driver else None,
        delivery_date=d.delivery_date,
        delivery_time=d.delivery_time,
        gross_weight_kg=d.gross_weight_kg,
        net_weight_kg=d.net_weight_kg,
        design_mix=dm_out,
        batch_actuals=actuals_out,
    )


@router.post("/{delivery_id}/batch-actuals", status_code=200)
def save_batch_actuals(
    delivery_id: int,
    body: BatchActualsSave,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if not db.get(Delivery, delivery_id):
        raise HTTPException(404, "Delivery not found")

    # Replace all actuals for this delivery
    db.query(BatchReportActual).filter_by(delivery_id=delivery_id).delete()
    for row in body.rows:
        actual = BatchReportActual(delivery_id=delivery_id, **row.model_dump())
        db.add(actual)
    db.commit()
    return {"saved": len(body.rows)}
