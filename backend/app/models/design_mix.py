from sqlalchemy import Column, Date, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import relationship

from app.database import Base

# Ingredients grouped by usage
# COMMON (both plants):  sand1, sand2, agg_20mm, agg_12mm, cem1, cem2, fly, wtr1, adx1, adx2
# M1.25 extra:           agg_6mm, agg6, cem3, cem4, wtr2, wtr3, adx3, adx4, silica
# CP30 extra:            moisture, filler, col1, col2, col3


class DesignMix(Base):
    __tablename__ = "design_mixes"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    grade_id = Column(Integer, ForeignKey("material_grades.id"), nullable=False, index=True)
    version = Column(Integer, nullable=False, default=1)
    valid_from = Column(Date, nullable=True)
    valid_to = Column(Date, nullable=True)

    # ── Common ingredients (both M1.25 and CP30) ──────────────────────────────
    sand1    = Column(Numeric(8, 3), default=0)
    sand2    = Column(Numeric(8, 3), default=0)
    agg_20mm = Column(Numeric(8, 3), default=0)
    agg_12mm = Column(Numeric(8, 3), default=0)
    cem1     = Column(Numeric(8, 3), default=0)
    cem2     = Column(Numeric(8, 3), default=0)
    fly      = Column(Numeric(8, 3), default=0)
    wtr1     = Column(Numeric(8, 3), default=0)
    adx1     = Column(Numeric(8, 3), default=0)
    adx2     = Column(Numeric(8, 3), default=0)

    # ── M1.25 extra ingredients ───────────────────────────────────────────────
    agg_6mm  = Column(Numeric(8, 3), default=0)
    agg6     = Column(Numeric(8, 3), default=0)
    cem3     = Column(Numeric(8, 3), default=0)
    cem4     = Column(Numeric(8, 3), default=0)
    wtr2     = Column(Numeric(8, 3), default=0)
    wtr3     = Column(Numeric(8, 3), default=0)
    adx3     = Column(Numeric(8, 3), default=0)
    adx4     = Column(Numeric(8, 3), default=0)
    silica   = Column(Numeric(8, 3), default=0)

    # ── CP30 extra ingredients ────────────────────────────────────────────────
    moisture = Column(Numeric(8, 3), default=0)
    filler   = Column(Numeric(8, 3), default=0)
    col1     = Column(Numeric(8, 3), default=0)
    col2     = Column(Numeric(8, 3), default=0)
    col3     = Column(Numeric(8, 3), default=0)

    total_density = Column(Numeric(10, 3), default=0)

    customer = relationship("Customer")
    grade = relationship("MaterialGrade", back_populates="design_mixes")
    deliveries = relationship("Delivery", back_populates="design_mix")

    def compute_density(self):
        fields = [
            self.sand1, self.sand2, self.agg_20mm, self.agg_12mm,
            self.cem1, self.cem2, self.fly, self.wtr1, self.adx1, self.adx2,
            self.agg_6mm, self.agg6, self.cem3, self.cem4,
            self.wtr2, self.wtr3, self.adx3, self.adx4, self.silica,
            self.moisture, self.filler, self.col1, self.col2, self.col3,
        ]
        self.total_density = sum(float(v or 0) for v in fields)
        return self.total_density
