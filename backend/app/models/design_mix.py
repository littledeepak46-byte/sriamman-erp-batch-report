from sqlalchemy import Column, Date, Integer, Numeric, String
from sqlalchemy.orm import relationship

from app.database import Base


class DesignMix(Base):
    __tablename__ = "design_mixes"

    id = Column(Integer, primary_key=True, index=True)
    plant_type = Column(String(10), nullable=False)  # M1.25 | CP30
    grade_id = Column(Integer, nullable=False, index=True)
    version = Column(Integer, nullable=False, default=1)
    valid_from = Column(Date, nullable=True)
    valid_to = Column(Date, nullable=True)

    # 24 ingredient columns (kg/m³)
    sand1 = Column(Numeric(8, 3), default=0)
    agg_20mm = Column(Numeric(8, 3), default=0)
    sand2 = Column(Numeric(8, 3), default=0)
    agg_12mm = Column(Numeric(8, 3), default=0)
    agg_6mm = Column(Numeric(8, 3), default=0)
    agg6 = Column(Numeric(8, 3), default=0)
    cem1 = Column(Numeric(8, 3), default=0)
    cem2 = Column(Numeric(8, 3), default=0)
    cem3 = Column(Numeric(8, 3), default=0)
    cem4 = Column(Numeric(8, 3), default=0)
    fly = Column(Numeric(8, 3), default=0)
    wtr1 = Column(Numeric(8, 3), default=0)
    wtr2 = Column(Numeric(8, 3), default=0)
    wtr3 = Column(Numeric(8, 3), default=0)
    adx1 = Column(Numeric(8, 3), default=0)
    adx2 = Column(Numeric(8, 3), default=0)
    adx3 = Column(Numeric(8, 3), default=0)
    adx4 = Column(Numeric(8, 3), default=0)
    silica = Column(Numeric(8, 3), default=0)
    moisture = Column(Numeric(8, 3), default=0)
    filler = Column(Numeric(8, 3), default=0)
    col1 = Column(Numeric(8, 3), default=0)
    col2 = Column(Numeric(8, 3), default=0)
    col3 = Column(Numeric(8, 3), default=0)

    # computed in Python before save
    total_density = Column(Numeric(10, 3), default=0)

    grade = relationship("MaterialGrade", back_populates="design_mixes")
    deliveries = relationship("Delivery", back_populates="design_mix")

    def compute_density(self):
        ingredients = [
            self.sand1, self.agg_20mm, self.sand2, self.agg_12mm, self.agg_6mm,
            self.agg6, self.cem1, self.cem2, self.cem3, self.cem4, self.fly,
            self.wtr1, self.wtr2, self.wtr3, self.adx1, self.adx2, self.adx3,
            self.adx4, self.silica, self.moisture, self.filler, self.col1,
            self.col2, self.col3,
        ]
        self.total_density = sum(float(v or 0) for v in ingredients)
        return self.total_density
