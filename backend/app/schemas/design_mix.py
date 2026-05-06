from datetime import date
from decimal import Decimal
from pydantic import BaseModel, model_validator

DENSITY_MIN = 2410


class DesignMixBase(BaseModel):
    plant_type: str          # M1.25 | CP30
    grade_id: int
    valid_from: date | None = None
    valid_to: date | None = None

    sand1: Decimal = Decimal("0")
    agg_20mm: Decimal = Decimal("0")
    sand2: Decimal = Decimal("0")
    agg_12mm: Decimal = Decimal("0")
    agg_6mm: Decimal = Decimal("0")
    agg6: Decimal = Decimal("0")
    cem1: Decimal = Decimal("0")
    cem2: Decimal = Decimal("0")
    cem3: Decimal = Decimal("0")
    cem4: Decimal = Decimal("0")
    fly: Decimal = Decimal("0")
    wtr1: Decimal = Decimal("0")
    wtr2: Decimal = Decimal("0")
    wtr3: Decimal = Decimal("0")
    adx1: Decimal = Decimal("0")
    adx2: Decimal = Decimal("0")
    adx3: Decimal = Decimal("0")
    adx4: Decimal = Decimal("0")
    silica: Decimal = Decimal("0")
    moisture: Decimal = Decimal("0")
    filler: Decimal = Decimal("0")
    col1: Decimal = Decimal("0")
    col2: Decimal = Decimal("0")
    col3: Decimal = Decimal("0")

    @model_validator(mode="after")
    def check_density(self):
        fields = [
            self.sand1, self.agg_20mm, self.sand2, self.agg_12mm, self.agg_6mm,
            self.agg6, self.cem1, self.cem2, self.cem3, self.cem4, self.fly,
            self.wtr1, self.wtr2, self.wtr3, self.adx1, self.adx2, self.adx3,
            self.adx4, self.silica, self.moisture, self.filler, self.col1,
            self.col2, self.col3,
        ]
        total = sum(float(v) for v in fields)
        if total < DENSITY_MIN:
            raise ValueError(f"Total density {total:.1f} kg/m³ is below minimum {DENSITY_MIN} kg/m³")
        return self


class DesignMixCreate(DesignMixBase):
    pass


class DesignMixUpdate(DesignMixBase):
    pass


class DesignMixOut(DesignMixBase):
    id: int
    version: int
    total_density: Decimal
    grade_name: str | None = None
    plant_type: str

    class Config:
        from_attributes = True
