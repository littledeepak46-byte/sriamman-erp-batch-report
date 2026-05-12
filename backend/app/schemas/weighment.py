from datetime import date, time
from decimal import Decimal
from pydantic import BaseModel, model_validator


class WeighmentCreate(BaseModel):
    type: str                                   # INWARD | OUTWARD
    delivery_id: int | None = None
    vehicle_number: str
    driver_name: str | None = None
    material_description: str | None = None
    supplier: str | None = None
    gross_weight_kg: Decimal | None = None   # optional — blank for empty-weight-only entry
    tare_weight_kg: Decimal
    weigh_date: date
    weigh_time: time
    remarks: str | None = None

    # No validation — Net = Gross − Empty always, including negative values


class WeighmentUpdate(BaseModel):
    vehicle_number: str
    driver_name: str | None = None
    material_description: str | None = None
    supplier: str | None = None
    gross_weight_kg: Decimal | None = None
    tare_weight_kg: Decimal
    weigh_date: date
    weigh_time: time
    remarks: str | None = None


class WeighmentOut(BaseModel):
    id: int
    ticket_number: str
    type: str
    delivery_id: int | None
    dc_number: str | None = None
    vehicle_number: str
    driver_name: str | None
    material_description: str | None
    supplier: str | None
    gross_weight_kg: Decimal | None
    tare_weight_kg: Decimal
    net_weight_kg: Decimal | None
    weigh_date: date
    weigh_time: time
    remarks: str | None

    class Config:
        from_attributes = True


class IngredientLabelOut(BaseModel):
    key: str
    label: str
    group: str
    sort_order: int

    class Config:
        from_attributes = True


class IngredientLabelUpdate(BaseModel):
    label: str


class IngredientLabelCreate(BaseModel):
    key: str
    label: str
    group: str = "COMMON"   # COMMON | M125 | CP30
    sort_order: int = 99
