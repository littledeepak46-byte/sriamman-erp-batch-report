from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Time, func
from sqlalchemy.orm import relationship

from app.database import Base


class WeighmentRecord(Base):
    __tablename__ = "weighment_records"

    id = Column(Integer, primary_key=True, index=True)
    ticket_number = Column(String(20), unique=True, nullable=False, index=True)
    type = Column(String(10), nullable=False)        # INWARD | OUTWARD

    # OUTWARD → linked to a delivery; INWARD → standalone
    delivery_id = Column(Integer, ForeignKey("deliveries.id"), nullable=True)

    vehicle_number = Column(String(20), nullable=False)
    driver_name = Column(String(100), nullable=True)
    material_description = Column(String(200), nullable=True)
    supplier = Column(String(200), nullable=True)   # inward only

    gross_weight_kg = Column(Numeric(10, 2), nullable=False)
    tare_weight_kg = Column(Numeric(10, 2), nullable=False)
    net_weight_kg = Column(Numeric(10, 2), nullable=False)

    weigh_date = Column(Date, nullable=False)
    weigh_time = Column(Time, nullable=False)
    remarks = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    delivery = relationship("Delivery")


class WeighmentSequence(Base):
    __tablename__ = "weighment_sequences"

    id = Column(Integer, primary_key=True)
    year_code = Column(String(10), nullable=False, unique=True, index=True)
    last_number = Column(Integer, nullable=False, default=0)


class IngredientLabel(Base):
    """Stores admin-customisable display labels for the 24 ingredient keys."""
    __tablename__ = "ingredient_labels"

    key = Column(String(20), primary_key=True)   # e.g. "sand1", "agg_20mm"
    label = Column(String(50), nullable=False)    # e.g. "Sand 1", "20 MM Aggregate"
    group = Column(String(10), nullable=False)    # COMMON | M125 | CP30
    sort_order = Column(Integer, nullable=False, default=0)
