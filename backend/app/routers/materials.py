from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.material import MaterialGrade, MaterialType, PumpingType
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.material import (
    MaterialGradeCreate, MaterialGradeOut,
    MaterialTypeCreate, MaterialTypeOut,
    PumpingTypeCreate, PumpingTypeOut,
)

router = APIRouter(tags=["materials"])


@router.get("/material-types", response_model=list[MaterialTypeOut])
def list_material_types(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(MaterialType).filter_by(is_active=True).order_by(MaterialType.name).all()


@router.post("/material-types", response_model=MaterialTypeOut, status_code=201)
def create_material_type(body: MaterialTypeCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    if db.query(MaterialType).filter_by(name=body.name).first():
        raise HTTPException(400, "Material type already exists")
    mt = MaterialType(name=body.name)
    db.add(mt)
    db.commit()
    db.refresh(mt)
    return mt


@router.get("/material-grades", response_model=list[MaterialGradeOut])
def list_grades(material_type_id: int | None = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    q = db.query(MaterialGrade).filter_by(is_active=True)
    if material_type_id:
        q = q.filter_by(material_type_id=material_type_id)
    return q.order_by(MaterialGrade.grade_name).all()


@router.post("/material-grades", response_model=MaterialGradeOut, status_code=201)
def create_grade(body: MaterialGradeCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    if not db.query(MaterialType).filter_by(id=body.material_type_id).first():
        raise HTTPException(404, "Material type not found")
    if db.query(MaterialGrade).filter_by(material_type_id=body.material_type_id, grade_name=body.grade_name).first():
        raise HTTPException(400, "Grade already exists for this material type")
    g = MaterialGrade(**body.model_dump())
    db.add(g)
    db.commit()
    db.refresh(g)
    return g


@router.delete("/material-grades/{gid}", status_code=204)
def delete_grade(gid: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    g = db.query(MaterialGrade).filter_by(id=gid).first()
    if not g:
        raise HTTPException(404, "Grade not found")
    g.is_active = False
    db.commit()


@router.get("/pumping-types", response_model=list[PumpingTypeOut])
def list_pumping_types(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(PumpingType).filter_by(is_active=True).order_by(PumpingType.name).all()


@router.post("/pumping-types", response_model=PumpingTypeOut, status_code=201)
def create_pumping_type(body: PumpingTypeCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    if db.query(PumpingType).filter_by(name=body.name).first():
        raise HTTPException(400, "Pumping type already exists")
    pt = PumpingType(name=body.name)
    db.add(pt)
    db.commit()
    db.refresh(pt)
    return pt
