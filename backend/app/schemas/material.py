from pydantic import BaseModel


class MaterialGradeOut(BaseModel):
    id: int
    grade_name: str
    is_active: bool

    class Config:
        from_attributes = True


class MaterialTypeOut(BaseModel):
    id: int
    name: str
    is_active: bool
    quantity_unit: str = "m³"
    quantity_step: str = "0.01"
    grades: list[MaterialGradeOut] = []

    class Config:
        from_attributes = True


class MaterialTypeQuantityUpdate(BaseModel):
    quantity_unit: str
    quantity_step: str


class MaterialGradeCreate(BaseModel):
    grade_name: str
    material_type_id: int


class MaterialTypeCreate(BaseModel):
    name: str


class PumpingTypeOut(BaseModel):
    id: int
    name: str
    is_active: bool

    class Config:
        from_attributes = True


class PumpingTypeCreate(BaseModel):
    name: str
