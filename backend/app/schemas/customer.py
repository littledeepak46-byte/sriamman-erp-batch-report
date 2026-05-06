from pydantic import BaseModel


class CustomerSiteBase(BaseModel):
    site_name: str
    door_no: str | None = None
    street1: str | None = None
    street2: str | None = None
    city: str
    state: str | None = None
    pincode: str | None = None


class CustomerSiteCreate(CustomerSiteBase):
    pass


class CustomerSiteOut(CustomerSiteBase):
    id: int
    customer_id: int
    is_active: bool

    class Config:
        from_attributes = True


class CustomerBase(BaseModel):
    name: str
    gst_number: str | None = None
    billing_address_line1: str | None = None
    billing_address_line2: str | None = None
    billing_city: str | None = None
    billing_state: str | None = None
    billing_pincode: str | None = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(CustomerBase):
    pass


class CustomerOut(CustomerBase):
    id: int
    is_active: bool
    sites: list[CustomerSiteOut] = []

    class Config:
        from_attributes = True


class CustomerListItem(BaseModel):
    id: int
    name: str
    gst_number: str | None
    billing_city: str | None
    is_active: bool

    class Config:
        from_attributes = True
