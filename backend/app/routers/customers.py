from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.customer import Customer, CustomerSite
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.customer import (
    CustomerCreate, CustomerListItem, CustomerOut, CustomerUpdate,
    CustomerSiteCreate, CustomerSiteOut,
)

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("", response_model=list[CustomerListItem])
def list_customers(active_only: bool = True, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    q = db.query(Customer)
    if active_only:
        q = q.filter(Customer.is_active == True)
    return q.order_by(Customer.name).all()


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(customer_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    c = db.query(Customer).filter_by(id=customer_id).first()
    if not c:
        raise HTTPException(404, "Customer not found")
    return c


@router.post("", response_model=CustomerOut, status_code=201)
def create_customer(body: CustomerCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    customer = Customer(**body.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.put("/{customer_id}", response_model=CustomerOut)
def update_customer(customer_id: int, body: CustomerUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    c = db.query(Customer).filter_by(id=customer_id).first()
    if not c:
        raise HTTPException(404, "Customer not found")
    for k, v in body.model_dump().items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return c


@router.delete("/{customer_id}", status_code=204)
def delete_customer(customer_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    c = db.query(Customer).filter_by(id=customer_id).first()
    if not c:
        raise HTTPException(404, "Customer not found")
    c.is_active = False
    db.commit()


# ── Sites ──────────────────────────────────────────────────────────────────────

@router.get("/{customer_id}/sites", response_model=list[CustomerSiteOut])
def list_sites(customer_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return (
        db.query(CustomerSite)
        .filter_by(customer_id=customer_id, is_active=True)
        .order_by(CustomerSite.site_name)
        .all()
    )


@router.post("/{customer_id}/sites", response_model=CustomerSiteOut, status_code=201)
def create_site(customer_id: int, body: CustomerSiteCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    if not db.query(Customer).filter_by(id=customer_id).first():
        raise HTTPException(404, "Customer not found")
    site = CustomerSite(customer_id=customer_id, **body.model_dump())
    db.add(site)
    db.commit()
    db.refresh(site)
    return site


@router.put("/{customer_id}/sites/{site_id}", response_model=CustomerSiteOut)
def update_site(customer_id: int, site_id: int, body: CustomerSiteCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    s = db.query(CustomerSite).filter_by(id=site_id, customer_id=customer_id).first()
    if not s:
        raise HTTPException(404, "Site not found")
    for k, v in body.model_dump().items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return s


@router.delete("/{customer_id}/sites/{site_id}", status_code=204)
def delete_site(customer_id: int, site_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    s = db.query(CustomerSite).filter_by(id=site_id, customer_id=customer_id).first()
    if not s:
        raise HTTPException(404, "Site not found")
    s.is_active = False
    db.commit()
