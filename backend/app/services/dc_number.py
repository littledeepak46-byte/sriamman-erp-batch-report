"""
DC Number Engine — atomic, unique per month.
Format: SARMC / {FY} / {MON} / {NNNN}
Example: SARMC/2026-27/MAY/0262

Financial year: April → March.  April 2026 belongs to FY 2026-27.
Running number resets to 001 at the start of each month.
Row-level lock on dc_sequences prevents duplicate numbers under concurrent saves.
"""
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.sequence import DCSequence

_MONTH_ABBR = {
    1: "JAN", 2: "FEB", 3: "MAR", 4: "APR", 5: "MAY", 6: "JUN",
    7: "JUL", 8: "AUG", 9: "SEP", 10: "OCT", 11: "NOV", 12: "DEC",
}


def _financial_year(d: date) -> str:
    if d.month >= 4:                          # April onward → new FY
        return f"{d.year}-{str(d.year + 1)[-2:]}"
    return f"{d.year - 1}-{str(d.year)[-2:]}"


def generate_dc_number(db: Session, delivery_date: date) -> str:
    fy = _financial_year(delivery_date)
    mon = _MONTH_ABBR[delivery_date.month]

    # Lock the row (or insert a new one) so concurrent requests serialise here
    seq = (
        db.execute(
            select(DCSequence)
            .where(DCSequence.year_code == fy, DCSequence.month_code == mon)
            .with_for_update()           # row-level lock
        )
        .scalar_one_or_none()
    )

    if seq is None:
        seq = DCSequence(year_code=fy, month_code=mon, last_number=0)
        db.add(seq)
        db.flush()                       # get an id before we increment

    seq.last_number += 1
    db.flush()                           # write the incremented value

    return f"SARMC/{fy}/{mon}/{seq.last_number:04d}"
