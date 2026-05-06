"""
Cumulative Quantity — sum of all deliveries for the same
customer + date + site + grade + plant_type, plus the current entry.
"""
from datetime import date
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.delivery import Delivery


def get_cumulative_qty(
    db: Session,
    customer_id: int,
    site_id: int,
    grade_id: int,
    plant_type: str | None,
    delivery_date: date,
    current_qty: Decimal,
    exclude_delivery_id: int | None = None,
) -> Decimal:
    q = db.query(func.sum(Delivery.quantity_m3)).filter(
        Delivery.customer_id == customer_id,
        Delivery.site_id == site_id,
        Delivery.grade_id == grade_id,
        Delivery.delivery_date == delivery_date,
    )
    if plant_type:
        q = q.filter(Delivery.plant_type == plant_type)
    if exclude_delivery_id:
        q = q.filter(Delivery.id != exclude_delivery_id)

    historical = q.scalar() or Decimal("0")
    return Decimal(str(historical)) + current_qty


def get_batch_size(qty: Decimal, max_batch: Decimal) -> tuple[Decimal, int]:
    """Returns (batch_size, num_batches) using CEILING(qty / maxBatch)."""
    import math
    num_batches = math.ceil(float(qty) / float(max_batch))
    batch_size = Decimal(str(float(qty) / num_batches)) if num_batches else qty
    return round(batch_size, 3), num_batches
