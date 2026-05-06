"""Run once to seed the database with initial data.
Usage: python -m app.seed
"""
from app.database import SessionLocal, engine
from app.models import *  # ensures all tables are registered
from app.database import Base
from app.models.user import User
from app.models.material import MaterialType, MaterialGrade, PumpingType
from app.models.sequence import BatchSequence
from app.services.auth import hash_password


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Admin user
    if not db.query(User).filter_by(username="admin").first():
        db.add(User(username="admin", password_hash=hash_password("admin123"), role="admin"))
        print("Created admin user (password: admin123) — CHANGE THIS IN PRODUCTION")

    # Material types & grades
    materials = {
        "Concrete": ["M10", "M15", "M20", "M25", "M25OPC", "M30", "M30OPC", "M35", "M40"],
        "Bitumen": ["DBM", "BC", "SDBC"],
        "Precast": ["General"],
        "Oil": ["General"],
        "Emulsion": ["General"],
    }
    for mat_name, grades in materials.items():
        mat = db.query(MaterialType).filter_by(name=mat_name).first()
        if not mat:
            mat = MaterialType(name=mat_name)
            db.add(mat)
            db.flush()
        for g in grades:
            if not db.query(MaterialGrade).filter_by(material_type_id=mat.id, grade_name=g).first():
                db.add(MaterialGrade(material_type_id=mat.id, grade_name=g))

    # Pumping types
    for pt in ["Pump 1", "Pump 2", "Boom Pump", "Manual"]:
        if not db.query(PumpingType).filter_by(name=pt).first():
            db.add(PumpingType(name=pt))

    # Batch sequences
    for plant in ["M1.25", "CP30"]:
        if not db.query(BatchSequence).filter_by(plant_type=plant).first():
            db.add(BatchSequence(plant_type=plant, last_batch_number=0))

    db.commit()
    db.close()
    print("Seed complete.")


if __name__ == "__main__":
    seed()
