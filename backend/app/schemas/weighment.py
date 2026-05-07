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
    gross_weight_kg: Decimal
    tare_weight_kg: Decimal
    weigh_date: date
    weigh_time: time
    remarks: str | None = None

    @model_validator(mode="after")
    def check_net(self):
        if self.gross_weight_kg <= self.tare_weight_kg:
            raise ValueError("Gross weight must be greater than tare weight")
        return self


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
    gross_weight_kg: Decimal
    tare_weight_kg: Decimal
    net_weight_kg: Decimal
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
