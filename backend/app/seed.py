"""Seed script — runs on every container startup (idempotent).
Usage: python -m app.seed
"""
from app.database import SessionLocal, engine
from app.models import *  # noqa: F401,F403 — registers all models
from app.database import Base
from app.models.customer import Customer, CustomerSite
from app.models.design_mix import DesignMix
from app.models.material import MaterialGrade, MaterialType, PumpingType
from app.models.sequence import BatchSequence
from app.models.user import User
from app.models.vehicle import Driver, Vehicle
from app.models.weighment import IngredientLabel, MaterialTolerance, TimingSetting, WeighmentSequence
from app.services.auth import hash_password

DEFAULT_INGREDIENTS = [
    # key, label, group, sort_order
    ("sand1",    "Sand 1",        "COMMON", 1),
    ("sand2",    "Sand 2",        "COMMON", 2),
    ("agg_20mm", "20 MM",         "COMMON", 3),
    ("agg_12mm", "12 MM",         "COMMON", 4),
    ("cem1",     "Cement 1",      "COMMON", 5),
    ("cem2",     "Cement 2",      "COMMON", 6),
    ("fly",      "Fly Ash",       "COMMON", 7),
    ("wtr1",     "Water 1",       "COMMON", 8),
    ("adx1",     "Admix 1",       "COMMON", 9),
    ("adx2",     "Admix 2",       "COMMON", 10),
    ("agg_6mm",  "6 MM",          "M125",   11),
    ("agg6",     "Agg",           "M125",   12),
    ("cem3",     "Cement 3",      "M125",   13),
    ("cem4",     "Cement 4",      "M125",   14),
    ("wtr2",     "Water 2",       "M125",   15),
    ("wtr3",     "Water 3",       "M125",   16),
    ("adx3",     "Admix 3",       "M125",   17),
    ("adx4",     "Admix 4",       "M125",   18),
    ("silica",   "Silica",        "M125",   19),
    ("moisture", "Moisture",      "CP30",   20),
    ("filler",   "Filler",        "CP30",   21),
    ("col1",     "1",             "CP30",   22),
    ("col2",     "2",             "CP30",   23),
    ("col3",     "3",             "CP30",   24),
]


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # ── Admin user ─────────────────────────────────────────────────────────────
    if not db.query(User).filter_by(username="admin").first():
        db.add(User(username="admin", password_hash=hash_password("admin123"), role="admin"))
        print("✅ Created admin user  username=admin  password=admin123  ← CHANGE IN PRODUCTION")
    else:
        print("ℹ️  Admin user already exists, skipping.")

    # ── Material types & grades ────────────────────────────────────────────────
    materials = {
        "Concrete": ["M10", "M15", "M20", "M25", "M25OPC", "M30", "M30OPC", "M35", "M40"],
        "Bitumen":  ["DBM", "BC", "SDBC"],
        "Precast":  ["General"],
        "Oil":      ["General"],
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

    # Weighment sequence — keyed by fiscal year; seed current year
    from datetime import date
    from app.services.dc_number import _financial_year
    fy = _financial_year(date.today())
    if not db.query(WeighmentSequence).filter_by(year_code=fy).first():
        db.add(WeighmentSequence(year_code=fy, last_number=0))

    # ── Material quantity units ────────────────────────────────────────────────
    qty_units = {
        "Concrete": ("m³",   "0.01"),
        "Bitumen":  ("ton",  "0.001"),
        "Precast":  ("nos",  "1"),
        "Oil":      ("litre","1"),
        "Emulsion": ("litre","1"),
    }
    for mat_name, (unit, step) in qty_units.items():
        mt = db.query(MaterialType).filter_by(name=mat_name).first()
        if mt and (not mt.quantity_unit or mt.quantity_unit == "m³" and mat_name != "Concrete"):
            mt.quantity_unit = unit
            mt.quantity_step = step

    # ── Batch tolerances ──────────────────────────────────────────────────────
    default_tolerances = [
        ("sand1",    "Sand 1 (MSAND)",    25),
        ("agg_20mm", "20MM Aggregate",    25),
        ("sand2",    "Sand 2 (MSAND)",    25),
        ("agg_12mm", "12MM Aggregate",    25),
        ("agg_6mm",  "6MM Aggregate",     25),
        ("agg6",     "Agg6",              25),
        ("cem1",     "Cement 1",           4),
        ("cem2",     "Cement 2",           4),
        ("cem3",     "Cement 3",           4),
        ("cem4",     "Cement 4",           4),
        ("fly",      "Fly Ash (CEM5)",     4),
        ("wtr1",     "Water 1",           10),
        ("wtr2",     "Water 2",           10),
        ("wtr3",     "Water 3",           10),
        ("adx1",     "Admixture 1",      0.5),
        ("adx2",     "Admixture 2",      0.5),
        ("adx3",     "Admixture 3",      0.5),
        ("adx4",     "Admixture 4",      0.5),
        ("silica",   "Silica",             0),
    ]
    for key, label, tol in default_tolerances:
        if not db.get(MaterialTolerance, key):
            db.add(MaterialTolerance(key=key, label=label, tolerance=tol))

    # ── Timing settings ───────────────────────────────────────────────────────
    default_timing = [
        ("batch_end_min",      "DC → Batch End offset minimum",  2,  "min"),
        ("batch_end_max",      "DC → Batch End offset maximum",  4,  "min"),
        ("batch_per_duration", "Duration per batch",             69, "sec"),
        ("weighment_min",      "Batch End → Weighment minimum",  2,  "min"),
        ("weighment_max",      "Batch End → Weighment maximum",  4,  "min"),
    ]
    for key, label, value, unit in default_timing:
        if not db.get(TimingSetting, key):
            db.add(TimingSetting(key=key, label=label, value=value, unit=unit))

    # Ingredient labels
    for key, label, group, order in DEFAULT_INGREDIENTS:
        if not db.get(IngredientLabel, key):
            db.add(IngredientLabel(key=key, label=label, group=group, sort_order=order))

    db.flush()

    # ── Sample Customer ────────────────────────────────────────────────────────
    sample_customer = db.query(Customer).filter_by(name="Sri Murugan Constructions").first()
    if not sample_customer:
        sample_customer = Customer(
            name="Sri Murugan Constructions",
            gst_number="33AABCS1234F1ZX",
            billing_address_line1="No.12, Gandhi Road",
            billing_address_line2="Hosur Industrial Area",
            billing_city="Hosur",
            billing_state="Tamil Nadu",
            billing_pincode="635109",
        )
        db.add(sample_customer)
        db.flush()

        # Site 1
        db.add(CustomerSite(
            customer_id=sample_customer.id,
            site_name="Hosur Main Site",
            door_no="12",
            street1="Gandhi Road",
            city="Hosur",
            state="Tamil Nadu",
            pincode="635109",
        ))
        # Site 2
        db.add(CustomerSite(
            customer_id=sample_customer.id,
            site_name="Krishnagiri Site",
            door_no="45",
            street1="NH-44 Bypass",
            city="Krishnagiri",
            state="Tamil Nadu",
            pincode="635001",
        ))
        print("✅ Created sample customer: Sri Murugan Constructions (2 sites)")
    else:
        print("ℹ️  Sample customer already exists, skipping.")

    # ── Sample Driver ──────────────────────────────────────────────────────────
    sample_driver = db.query(Driver).filter_by(name="Rajan Kumar").first()
    if not sample_driver:
        sample_driver = Driver(name="Rajan Kumar", phone="9876543210")
        db.add(sample_driver)
        db.flush()
        print("✅ Created sample driver: Rajan Kumar")
    else:
        print("ℹ️  Sample driver already exists, skipping.")

    # ── Sample Vehicle (with default driver) ──────────────────────────────────
    sample_vehicle = db.query(Vehicle).filter_by(vehicle_number="TN29AB1234").first()
    if not sample_vehicle:
        sample_vehicle = Vehicle(
            vehicle_number="TN29AB1234",
            empty_weight_kg=12360,
            default_driver_id=sample_driver.id,
        )
        db.add(sample_vehicle)
        db.flush()
        print("✅ Created sample vehicle: TN29AB1234  (empty wt: 12,360 kg  driver: Rajan Kumar)")
    else:
        print("ℹ️  Sample vehicle already exists, skipping.")

    # ── Sample Design Mix (M25 grade for sample customer) ─────────────────────
    concrete_type = db.query(MaterialType).filter_by(name="Concrete").first()
    m25_grade = db.query(MaterialGrade).filter_by(
        material_type_id=concrete_type.id, grade_name="M25"
    ).first() if concrete_type else None

    if m25_grade and sample_customer:
        existing_mix = db.query(DesignMix).filter_by(
            customer_id=sample_customer.id, grade_id=m25_grade.id
        ).first()
        if not existing_mix:
            # Typical M25 RMC design mix values (kg/m³)
            dm = DesignMix(
                customer_id=sample_customer.id,
                grade_id=m25_grade.id,
                version=1,

                # ── Common ingredients ──────────────────────────────────────
                sand1    = 460,    # River sand
                sand2    = 325,    # Manufactured sand
                agg_20mm = 620,    # 20 mm aggregate
                agg_12mm = 230,    # 12 mm aggregate
                cem1     = 360,    # OPC 53 grade cement
                cem2     = 0,
                fly      = 60,     # Fly ash
                wtr1     = 165,    # Mix water
                adx1     = 3.6,    # Plasticizer
                adx2     = 0,

                # ── M1.25 extra ingredients ─────────────────────────────────
                agg_6mm  = 120,    # 6 mm aggregate
                agg6     = 0,
                cem3     = 0,
                cem4     = 0,
                wtr2     = 15,     # Correction water
                wtr3     = 0,
                adx3     = 0,
                adx4     = 0,
                silica   = 20,     # Silica fume

                # ── CP30 extra ingredients ───────────────────────────────────
                moisture = 8,      # Aggregate moisture correction
                filler   = 30,     # Stone dust filler
                col1     = 0,
                col2     = 0,
                col3     = 0,
            )
            # Compute and set total density
            dm.compute_density()
            db.add(dm)
            print(f"✅ Created sample design mix: M25 for Sri Murugan Constructions  "
                  f"(density: {float(dm.total_density):.1f} kg/m³)")
        else:
            print("ℹ️  Sample design mix already exists, skipping.")

    db.commit()
    db.close()
    print("✅ Seed complete.")


if __name__ == "__main__":
    seed()
