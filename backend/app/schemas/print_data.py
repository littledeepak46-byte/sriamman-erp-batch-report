from datetime import date, time
from decimal import Decimal
from pydantic import BaseModel


class DesignMixPrint(BaseModel):
    id: int
    customer_id: int
    grade_id: int
    customer_name: str | None = None
    grade_name: str | None = None
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
    total_density: Decimal = Decimal("0")

    class Config:
        from_attributes = True


class BatchActualRow(BaseModel):
    batch_sequence: int
    batch_size_m3: Decimal | None = None
    sand1_actual: Decimal = Decimal("0"); sand2_actual: Decimal = Decimal("0")
    agg_20mm_actual: Decimal = Decimal("0"); agg_12mm_actual: Decimal = Decimal("0")
    cem1_actual: Decimal = Decimal("0"); cem2_actual: Decimal = Decimal("0")
    fly_actual: Decimal = Decimal("0"); wtr1_actual: Decimal = Decimal("0")
    adx1_actual: Decimal = Decimal("0"); adx2_actual: Decimal = Decimal("0")
    agg_6mm_actual: Decimal = Decimal("0"); agg6_actual: Decimal = Decimal("0")
    cem3_actual: Decimal = Decimal("0"); cem4_actual: Decimal = Decimal("0")
    wtr2_actual: Decimal = Decimal("0"); wtr3_actual: Decimal = Decimal("0")
    adx3_actual: Decimal = Decimal("0"); adx4_actual: Decimal = Decimal("0")
    silica_actual: Decimal = Decimal("0"); moisture_actual: Decimal = Decimal("0")
    filler_actual: Decimal = Decimal("0"); col1_actual: Decimal = Decimal("0")
    col2_actual: Decimal = Decimal("0"); col3_actual: Decimal = Decimal("0")


class BatchActualsSave(BaseModel):
    rows: list[BatchActualRow]


class PrintDataOut(BaseModel):
    id: int
    dc_number: str
    batch_number: int | None
    order_number: int = 0
    customer_name: str
    customer_gst: str | None
    billing_address: str | None
    site_name: str | None
    site_location: str | None
    site_full_address: str | None
    plant_type: str | None
    material_name: str | None
    grade_name: str | None
    pumping_name: str | None
    quantity_m3: Decimal
    cumulative_qty_m3: Decimal | None
    vehicle_number: str | None
    empty_weight_kg: Decimal | None
    driver_name: str | None
    delivery_date: date
    delivery_time: time
    gross_weight_kg: Decimal | None
    net_weight_kg: Decimal | None
    operator_name: str | None = None
    design_mix: DesignMixPrint | None = None
    batch_actuals: list[BatchActualRow] = []
