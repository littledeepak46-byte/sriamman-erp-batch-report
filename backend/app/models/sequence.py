from sqlalchemy import Column, Integer, String, UniqueConstraint

from app.database import Base


class DCSequence(Base):
    __tablename__ = "dc_sequences"
    __table_args__ = (UniqueConstraint("year_code", "month_code", name="uq_dc_year_month"),)

    id = Column(Integer, primary_key=True, index=True)
    year_code = Column(String(10), nullable=False)   # e.g. 2026-27
    month_code = Column(String(3), nullable=False)   # e.g. MAY
    last_number = Column(Integer, nullable=False, default=0)


class BatchSequence(Base):
    __tablename__ = "batch_sequences"
    __table_args__ = (UniqueConstraint("plant_type", name="uq_batch_plant_type"),)

    id = Column(Integer, primary_key=True, index=True)
    plant_type = Column(String(10), nullable=False)  # M1.25 | CP30
    last_batch_number = Column(Integer, nullable=False, default=0)
