from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.customer import Customer
from app.models.design_mix import DesignMix
from app.models.material import MaterialGrade
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.design_mix import ALL_INGREDIENTS, DesignMixCreate, DesignMixOut, DesignMixUpdate

router = APIRouter(prefix="/design-mixes", tags=["design-mix"])


def _enrich(dm: DesignMix, db: Session) -> DesignMixOut:
    out = DesignMixOut.model_validate(dm)
    if c := db.get(Customer, dm.customer_id):
        out.customer_name = c.name
    if g := db.get(MaterialGrade, dm.grade_id):
        out.grade_name = g.grade_name
    return out


@router.get("", response_model=list[DesignMixOut])
def list_design_mixes(
    customer_id: int | None = None,
    grade_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(DesignMix).filter(DesignMix.valid_to == None)  # noqa: E711
    if customer_id:
        q = q.filter_by(customer_id=customer_id)
    if grade_id:
        q = q.filter_by(grade_id=grade_id)
    return [_enrich(dm, db) for dm in q.all()]


@router.get("/{dm_id}", response_model=DesignMixOut)
def get_design_mix(dm_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    dm = db.get(DesignMix, dm_id)
    if not dm:
        raise HTTPException(404, "Design mix not found")
    return _enrich(dm, db)


@router.get("/lookup/{customer_id}/{grade_id}", response_model=DesignMixOut)
def lookup(customer_id: int, grade_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    dm = (
        db.query(DesignMix)
        .filter_by(customer_id=customer_id, grade_id=grade_id)
        .filter(DesignMix.valid_to == None)  # noqa: E711
        .order_by(DesignMix.version.desc())
        .first()
    )
    if not dm:
        raise HTTPException(404, f"No design mix for customer {customer_id} / grade {grade_id}")
    return _enrich(dm, db)


def _calc_density(data: dict) -> float:
    return sum(float(data.get(f, 0)) for f in ALL_INGREDIENTS)


@router.post("", response_model=DesignMixOut, status_code=201)
def create_design_mix(body: DesignMixCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    if not db.get(Customer, body.customer_id):
        raise HTTPException(404, "Customer not found")
    if not db.get(MaterialGrade, body.grade_id):
        raise HTTPException(404, "Grade not found")
    data = body.model_dump()
    dm = DesignMix(**data, total_density=_calc_density(data))
    db.add(dm)
    db.commit()
    db.refresh(dm)
    return _enrich(dm, db)


@router.put("/{dm_id}", response_model=DesignMixOut)
def update_design_mix(dm_id: int, body: DesignMixUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    dm = db.get(DesignMix, dm_id)
    if not dm:
        raise HTTPException(404, "Design mix not found")
    data = body.model_dump()
    for k, v in data.items():
        setattr(dm, k, v)
    dm.total_density = _calc_density(data)
    db.commit()
    db.refresh(dm)
    return _enrich(dm, db)


@router.delete("/{dm_id}", status_code=204)
def delete_design_mix(dm_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    dm = db.get(DesignMix, dm_id)
    if not dm:
        raise HTTPException(404, "Design mix not found")
    db.delete(dm)
    db.commit()
