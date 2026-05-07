import math
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.customer import Customer, CustomerSite
from app.models.delivery import BatchReportActual, Delivery
from app.models.material import MaterialGrade
from app.models.user import User
from app.models.vehicle import Driver, Vehicle
from app.routers.auth import get_current_user
from app.services.batch_pdf import generate_m125_pdf

router = APIRouter(prefix="/batch-pdf", tags=["batch-pdf"])


@router.get("/{delivery_id}")
def get_batch_pdf(
    delivery_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    d = db.get(Delivery, delivery_id)
    if not d:
        raise HTTPException(404, "Delivery not found")
    if d.plant_type != "M1.25":
        raise HTTPException(400, "Batch PDF is only available for M1.25 plant deliveries")

    qty        = float(d.quantity_m3)
    max_batch  = 1.25
    num_batches = math.ceil(qty / max_batch)
    batch_size  = round(qty / num_batches, 3)

    customer   = db.get(Customer, d.customer_id)
    site       = db.get(CustomerSite, d.site_id)
    vehicle    = db.get(Vehicle, d.vehicle_id)
    driver     = db.get(Driver, d.driver_id)
    grade      = db.get(MaterialGrade, d.grade_id)

    date_str = d.delivery_date.strftime("%-m/%d/%Y") if d.delivery_date else ""

    delivery_data = {
        "batch_date":       date_str,
        "batch_start_time": str(d.delivery_time)[:8] if d.delivery_time else "",
        "batch_end_time":   "",
        "batch_number":     str(d.batch_number or ""),
        "order_number":     str(d.id),
        "customer":         customer.name if customer else "",
        "site":             d.site_location or (site.city if site else ""),
        "recipe_code":      grade.grade_name if grade else "",
        "recipe_name":      grade.grade_name if grade else "",
        "truck_number":     vehicle.vehicle_number if vehicle else "",
        "truck_driver":     driver.name if driver else "",
        "ordered_qty":      float(d.quantity_m3),
        "production_qty":   float(batch_size * num_batches),
        "with_this_load":   float(d.cumulative_qty_m3 or 0),
        "batch_size":       batch_size,
        "mixer_capacity":   max_batch,
        "num_batches":      num_batches,
    }

    actuals = (
        db.query(BatchReportActual)
        .filter_by(delivery_id=delivery_id)
        .order_by(BatchReportActual.batch_sequence)
        .all()
    )
    actuals_list = [
        {c.key: float(getattr(a, c.key + "_actual", 0) or 0)
         for c in [type("C", (), {"key": k})() for k in [
             "sand1","agg_20mm","sand2","agg_12mm","agg_6mm","agg6",
             "cem1","cem2","cem3","cem4","fly","wtr1","wtr2","wtr3",
             "adx1","adx2","adx3","adx4","silica",
         ]]}
        for a in actuals
    ]

    try:
        pdf_bytes = generate_m125_pdf(delivery_data, actuals_list)
    except FileNotFoundError as e:
        raise HTTPException(503, str(e))
    except (ValueError, RuntimeError) as e:
        raise HTTPException(500, str(e))

    dc = d.dc_number.replace("/", "-")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="BatchReport_{dc}.pdf"'},
    )
