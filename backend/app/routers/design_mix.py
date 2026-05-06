from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.design_mix import DesignMix
from app.models.material import MaterialGrade
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.design_mix import DesignMixCreate, DesignMixOut, DesignMixUpdate

router = APIRouter(prefix="/design-mixes", tags=["design-mix"])


def _enrich(dm: DesignMix, db: Session) -> DesignMixOut:
    grade = db.query(MaterialGrade).filter_by(id=dm.grade_id).first()
    out = DesignMixOut.model_validate(dm)
    out.grade_name = grade.grade_name if grade else None
    return out


@router.get("", response_model=list[DesignMixOut])
def list_design_mixes(
    plant_type: str | None = None,
    grade_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(DesignMix).filter(DesignMix.valid_to == None)  # noqa: E711 — active only
    if plant_type:
        q = q.filter_by(plant_type=plant_type)
    if grade_id:
        q = q.filter_by(grade_id=grade_id)
    return [_enrich(dm, db) for dm in q.all()]


@router.get("/{dm_id}", response_model=DesignMixOut)
def get_design_mix(dm_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    dm = db.query(DesignMix).filter_by(id=dm_id).first()
    if not dm:
        raise HTTPException(404, "Design mix not found")
    return _enrich(dm, db)


@router.get("/lookup/{plant_type}/{grade_id}", response_model=DesignMixOut)
def lookup(plant_type: str, grade_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    dm = (
        db.query(DesignMix)
        .filter_by(plant_type=plant_type, grade_id=grade_id)
        .filter(DesignMix.valid_to == None)  # noqa: E711
        .order_by(DesignMix.version.desc())
        .first()
    )
    if not dm:
        raise HTTPException(404, f"No design mix for {plant_type} / grade {grade_id}")
    return _enrich(dm, db)


@router.post("", response_model=DesignMixOut, status_code=201)
def create_design_mix(body: DesignMixCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    if not db.query(MaterialGrade).filter_by(id=body.grade_id).first():
        raise HTTPException(404, "Grade not found")
    data = body.model_dump()
    total = sum(float(data.get(f, 0)) for f in [
        "sand1","agg_20mm","sand2","agg_12mm","agg_6mm","agg6",
        "cem1","cem2","cem3","cem4","fly","wtr1","wtr2","wtr3",
        "adx1","adx2","adx3","adx4","silica","moisture","filler",
        "col1","col2","col3",
    ])
    dm = DesignMix(**data, total_density=total)
    db.add(dm)
    db.commit()
    db.refresh(dm)
    return _enrich(dm, db)


@router.put("/{dm_id}", response_model=DesignMixOut)
def update_design_mix(dm_id: int, body: DesignMixUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    dm = db.query(DesignMix).filter_by(id=dm_id).first()
    if not dm:
        raise HTTPException(404, "Design mix not found")
    data = body.model_dump()
    total = sum(float(data.get(f, 0)) for f in [
        "sand1","agg_20mm","sand2","agg_12mm","agg_6mm","agg6",
        "cem1","cem2","cem3","cem4","fly","wtr1","wtr2","wtr3",
        "adx1","adx2","adx3","adx4","silica","moisture","filler",
        "col1","col2","col3",
    ])
    for k, v in data.items():
        setattr(dm, k, v)
    dm.total_density = total
    db.commit()
    db.refresh(dm)
    return _enrich(dm, db)


@router.delete("/{dm_id}", status_code=204)
def delete_design_mix(dm_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    dm = db.query(DesignMix).filter_by(id=dm_id).first()
    if not dm:
        raise HTTPException(404, "Design mix not found")
    db.delete(dm)
    db.commit()
