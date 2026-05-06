"""
Batch Number Engine — global, never-resetting sequence per plant type.
M1.25 has its own counter; CP30 has its own.
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.sequence import BatchSequence


def generate_batch_number(db: Session, plant_type: str) -> int:
    seq = (
        db.execute(
            select(BatchSequence)
            .where(BatchSequence.plant_type == plant_type)
            .with_for_update()
        )
        .scalar_one_or_none()
    )

    if seq is None:
        seq = BatchSequence(plant_type=plant_type, last_batch_number=0)
        db.add(seq)
        db.flush()

    seq.last_batch_number += 1
    db.flush()
    return seq.last_batch_number
