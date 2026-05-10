from datetime import date, time
from decimal import Decimal
from pydantic import BaseModel


class DeliveryCreate(BaseModel):
    customer_id: int
    site_id: int
    plant_type: str | None = None          # M1.25 | CP30 | None
    material_type_id: int
    grade_id: int
    pumping_type_id: int | None = None
    quantity_m3: Decimal
    vehicle_id: int
    driver_id: int
    delivery_date: date
    delivery_time: time
    gross_weight_kg: Decimal | None = None
    generate_weighment: bool = True
    order_number: int = 0
    pour_type: str | None = None


class DeliveryUpdate(BaseModel):
    vehicle_id: int
    driver_id: int
    grade_id: int
    pumping_type_id: int | None = None
    quantity_m3: Decimal
    delivery_date: date
    delivery_time: time
    gross_weight_kg: Decimal | None = None
    order_number: int = 0
    pour_type: str | None = None
    plant_type: str | None = None


class DeliveryOut(BaseModel):
    id: int
    dc_number: str
    batch_number: int | None
    order_number: int = 0
    pour_type: str | None = None
    customer_id: int
    customer_name: str | None = None
    site_id: int
    site_name: str | None = None
    plant_type: str | None
    material_type_id: int
    material_name: str | None = None
    grade_id: int
    grade_name: str | None = None
    pumping_type_id: int | None
    pumping_name: str | None = None
    quantity_m3: Decimal
    cumulative_qty_m3: Decimal | None
    vehicle_id: int
    vehicle_number: str | None = None
    driver_id: int
    driver_name: str | None = None
    delivery_date: date
    delivery_time: time
    site_location: str | None
    gross_weight_kg: Decimal | None
    empty_weight_kg: Decimal | None
    net_weight_kg: Decimal | None
    design_mix_id: int | None
    generate_weighment: int = 1

    class Config:
        from_attributes = True


class DeliveryStats(BaseModel):
    today_count: int
    monthly_m3: float
    active_vehicles: int
    dc_this_month: int


class CumulativeQtyRequest(BaseModel):
    customer_id: int
    site_id: int
    grade_id: int
    plant_type: str | None
    delivery_date: date
    quantity_m3: Decimal
    exclude_delivery_id: int | None = None
