from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class MaterialType(Base):
    __tablename__ = "material_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    is_active = Column(Boolean, default=True)

    grades = relationship("MaterialGrade", back_populates="material_type", cascade="all, delete-orphan")
    deliveries = relationship("Delivery", back_populates="material_type")


class MaterialGrade(Base):
    __tablename__ = "material_grades"

    id = Column(Integer, primary_key=True, index=True)
    material_type_id = Column(Integer, ForeignKey("material_types.id"), nullable=False, index=True)
    grade_name = Column(String(50), nullable=False)
    is_active = Column(Boolean, default=True)

    material_type = relationship("MaterialType", back_populates="grades")
    design_mixes = relationship("DesignMix", back_populates="grade")
    deliveries = relationship("Delivery", back_populates="grade")


class PumpingType(Base):
    __tablename__ = "pumping_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    is_active = Column(Boolean, default=True)

    deliveries = relationship("Delivery", back_populates="pumping_type")
