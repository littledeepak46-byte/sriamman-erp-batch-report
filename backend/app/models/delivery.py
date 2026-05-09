from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Time, func
from sqlalchemy.orm import relationship

from app.database import Base


class Delivery(Base):
    __tablename__ = "deliveries"

    id = Column(Integer, primary_key=True, index=True)
    dc_number = Column(String(30), unique=True, nullable=False, index=True)
    batch_number = Column(Integer, nullable=True)
    order_number = Column(Integer, nullable=False, default=0, server_default="0")
    pour_type = Column(String(50), nullable=True)

    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    site_id = Column(Integer, ForeignKey("customer_sites.id"), nullable=False)
    plant_type = Column(String(10), nullable=True)
    material_type_id = Column(Integer, ForeignKey("material_types.id"), nullable=False)
    grade_id = Column(Integer, ForeignKey("material_grades.id"), nullable=False)
    pumping_type_id = Column(Integer, ForeignKey("pumping_types.id"), nullable=True)

    quantity_m3 = Column(Numeric(8, 2), nullable=False)
    cumulative_qty_m3 = Column(Numeric(8, 2), nullable=True)

    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False)

    delivery_date = Column(Date, nullable=False)
    delivery_time = Column(Time, nullable=False)

    site_location = Column(String(100), nullable=True)

    gross_weight_kg = Column(Numeric(10, 2), nullable=True)
    empty_weight_kg = Column(Numeric(10, 2), nullable=True)
    net_weight_kg = Column(Numeric(10, 2), nullable=True)

    generate_weighment = Column(Integer, nullable=False, default=1)  # 1=yes 0=no
    design_mix_id = Column(Integer, ForeignKey("design_mixes.id"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # relationships
    customer = relationship("Customer", back_populates="deliveries")
    site = relationship("CustomerSite", back_populates="deliveries")
    material_type = relationship("MaterialType", back_populates="deliveries")
    grade = relationship("MaterialGrade", back_populates="deliveries")
    pumping_type = relationship("PumpingType", back_populates="deliveries")
    vehicle = relationship("Vehicle", back_populates="deliveries")
    driver = relationship("Driver", back_populates="deliveries")
    design_mix = relationship("DesignMix", back_populates="deliveries")
    created_by_user = relationship("User", back_populates="deliveries")

    batch_actuals = relationship("BatchReportActual", back_populates="delivery", cascade="all, delete-orphan")


class BatchReportActual(Base):
    __tablename__ = "batch_report_actuals"

    id = Column(Integer, primary_key=True, index=True)
    delivery_id = Column(Integer, ForeignKey("deliveries.id"), nullable=False, index=True)
    batch_sequence = Column(Integer, nullable=False)   # 1, 2, 3 …
    batch_size_m3 = Column(Numeric(6, 3), nullable=True)
    cumulative_qty_m3 = Column(Numeric(8, 2), nullable=True)

    # actual ingredient values entered per batch
    sand1_actual = Column(Numeric(8, 3), default=0)
    agg_20mm_actual = Column(Numeric(8, 3), default=0)
    sand2_actual = Column(Numeric(8, 3), default=0)
    agg_12mm_actual = Column(Numeric(8, 3), default=0)
    agg_6mm_actual = Column(Numeric(8, 3), default=0)
    agg6_actual = Column(Numeric(8, 3), default=0)
    cem1_actual = Column(Numeric(8, 3), default=0)
    cem2_actual = Column(Numeric(8, 3), default=0)
    cem3_actual = Column(Numeric(8, 3), default=0)
    cem4_actual = Column(Numeric(8, 3), default=0)
    fly_actual = Column(Numeric(8, 3), default=0)
    wtr1_actual = Column(Numeric(8, 3), default=0)
    wtr2_actual = Column(Numeric(8, 3), default=0)
    wtr3_actual = Column(Numeric(8, 3), default=0)
    adx1_actual = Column(Numeric(8, 3), default=0)
    adx2_actual = Column(Numeric(8, 3), default=0)
    adx3_actual = Column(Numeric(8, 3), default=0)
    adx4_actual = Column(Numeric(8, 3), default=0)
    silica_actual = Column(Numeric(8, 3), default=0)
    moisture_actual = Column(Numeric(8, 3), default=0)
    filler_actual = Column(Numeric(8, 3), default=0)
    col1_actual = Column(Numeric(8, 3), default=0)
    col2_actual = Column(Numeric(8, 3), default=0)
    col3_actual = Column(Numeric(8, 3), default=0)

    delivery = relationship("Delivery", back_populates="batch_actuals")
