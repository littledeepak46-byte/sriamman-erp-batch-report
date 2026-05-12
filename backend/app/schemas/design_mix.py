from datetime import date
from decimal import Decimal
from pydantic import BaseModel, model_validator

DENSITY_MIN = 2410

ALL_INGREDIENTS = [
    "sand1","sand2","agg_20mm","agg_12mm","cem1","cem2","fly","wtr1","adx1","adx2",
    "agg_6mm","agg6","cem3","cem4","wtr2","wtr3","adx3","adx4","silica",
    "moisture","filler","col1","col2","col3",
]


class DesignMixBase(BaseModel):
    customer_id: int
    grade_id: int
    valid_from: date | None = None
    valid_to: date | None = None

    # Common
    sand1: Decimal = Decimal("0"); sand2: Decimal = Decimal("0")
    agg_20mm: Decimal = Decimal("0"); agg_12mm: Decimal = Decimal("0")
    cem1: Decimal = Decimal("0"); cem2: Decimal = Decimal("0")
    fly: Decimal = Decimal("0"); wtr1: Decimal = Decimal("0")
    adx1: Decimal = Decimal("0"); adx2: Decimal = Decimal("0")

    # M1.25 extra
    agg_6mm: Decimal = Decimal("0"); agg6: Decimal = Decimal("0")
    cem3: Decimal = Decimal("0"); cem4: Decimal = Decimal("0")
    wtr2: Decimal = Decimal("0"); wtr3: Decimal = Decimal("0")
    adx3: Decimal = Decimal("0"); adx4: Decimal = Decimal("0")
    silica: Decimal = Decimal("0")

    # CP30 extra
    moisture: Decimal = Decimal("0"); filler: Decimal = Decimal("0")
    col1: Decimal = Decimal("0"); col2: Decimal = Decimal("0")
    col3: Decimal = Decimal("0")

class DesignMixCreate(DesignMixBase):
    @model_validator(mode="after")
    def check_density(self):
        total = sum(float(getattr(self, f)) for f in ALL_INGREDIENTS)
        if total < DENSITY_MIN:
            raise ValueError(f"Total density {total:.1f} kg/m³ is below minimum {DENSITY_MIN} kg/m³")
        return self


class DesignMixUpdate(DesignMixBase):
    @model_validator(mode="after")
    def check_density(self):
        total = sum(float(getattr(self, f)) for f in ALL_INGREDIENTS)
        if total < DENSITY_MIN:
            raise ValueError(f"Total density {total:.1f} kg/m³ is below minimum {DENSITY_MIN} kg/m³")
        return self


class DesignMixOut(DesignMixBase):
    id: int
    version: int
    total_density: Decimal
    customer_name: str | None = None
    grade_name: str | None = None

    class Config:
        from_attributes = True
