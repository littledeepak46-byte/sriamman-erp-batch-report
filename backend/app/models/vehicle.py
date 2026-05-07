from sqlalchemy import Boolean, Column, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import relationship

from app.database import Base


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_number = Column(String(20), unique=True, nullable=False, index=True)
    empty_weight_kg = Column(Numeric(10, 2), nullable=False)
    default_driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=True)
    is_active = Column(Boolean, default=True)

    default_driver = relationship("Driver", foreign_keys=[default_driver_id])
    deliveries = relationship("Delivery", back_populates="vehicle")


class Driver(Base):
    __tablename__ = "drivers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(15), nullable=True)
    is_active = Column(Boolean, default=True)

    deliveries = relationship("Delivery", back_populates="driver")
