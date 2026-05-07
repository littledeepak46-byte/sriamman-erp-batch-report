from decimal import Decimal
from pydantic import BaseModel


class VehicleBase(BaseModel):
    vehicle_number: str
    empty_weight_kg: Decimal
    default_driver_id: int | None = None


class VehicleCreate(VehicleBase):
    pass


class VehicleUpdate(VehicleBase):
    pass


class VehicleOut(VehicleBase):
    id: int
    is_active: bool
    default_driver_name: str | None = None

    class Config:
        from_attributes = True


class DriverBase(BaseModel):
    name: str
    phone: str | None = None


class DriverCreate(DriverBase):
    pass


class DriverUpdate(DriverBase):
    pass


class DriverOut(DriverBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True
