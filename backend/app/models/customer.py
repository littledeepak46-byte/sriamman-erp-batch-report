from sqlalchemy import Boolean, Column, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    gst_number = Column(String(15), nullable=True)
    billing_address_line1 = Column(String(255), nullable=True)
    billing_address_line2 = Column(String(255), nullable=True)
    billing_city = Column(String(100), nullable=True)
    billing_state = Column(String(100), nullable=True)
    billing_pincode = Column(String(10), nullable=True)
    is_active = Column(Boolean, default=True)

    sites = relationship("CustomerSite", back_populates="customer", cascade="all, delete-orphan")
    deliveries = relationship("Delivery", back_populates="customer")


class CustomerSite(Base):
    __tablename__ = "customer_sites"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, nullable=False, index=True)
    site_name = Column(String(200), nullable=False)
    door_no = Column(String(50), nullable=True)
    street1 = Column(String(255), nullable=True)
    street2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=True)
    pincode = Column(String(10), nullable=True)
    is_active = Column(Boolean, default=True)

    customer = relationship("Customer", back_populates="sites")
    deliveries = relationship("Delivery", back_populates="site")
