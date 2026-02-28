"""
One-time migration: copy existing SQLite data into a Postgres database.

Usage:
  1) Set TARGET_DATABASE_URL to your Postgres URL (or DATABASE_URL).
     - If Railway gives you postgres://..., this script will upgrade it to
       postgresql+pg8000:// automatically (pure Python driver, no compiler needed).
  2) (Optional) Set SQLITE_PATH if your SQLite file is elsewhere.
  3) Run:  python migrate_sqlite_to_postgres.py

This script preserves IDs so relationships remain intact. It also normalizes
platform/enumeration values to lowercase to satisfy current enum constraints.
"""

import os
from typing import Dict, Any, List

from sqlalchemy import create_engine, insert, text
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import Campaign, Post, Follower, Engagement, Vote

SQLITE_PATH = os.environ.get("SQLITE_PATH", "backend/socialvote.db")
TARGET_DATABASE_URL = os.environ.get("TARGET_DATABASE_URL") or os.environ.get("DATABASE_URL")

if not TARGET_DATABASE_URL:
    raise SystemExit("Set TARGET_DATABASE_URL (preferred) or DATABASE_URL to your Postgres connection string.")

# Ensure pg8000 dialect for SQLAlchemy (pure Python, no build tools needed)
if TARGET_DATABASE_URL.startswith("postgres://"):
    TARGET_DATABASE_URL = TARGET_DATABASE_URL.replace("postgres://", "postgresql+pg8000://", 1)
elif TARGET_DATABASE_URL.startswith("postgresql://") and "+" not in TARGET_DATABASE_URL:
    TARGET_DATABASE_URL = TARGET_DATABASE_URL.replace("postgresql://", "postgresql+pg8000://", 1)

# Source (SQLite)
source_engine = create_engine(f"sqlite:///{SQLITE_PATH}")
SourceSession = sessionmaker(source_engine)


def _rows(model) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    with SourceSession() as session:
        for row in session.query(model).all():
            data = {col.key: getattr(row, col.key) for col in model.__table__.columns}
            # Normalize enum values to lowercase to satisfy current schema
            if model is Campaign and data.get("platform"):
                val = str(data["platform"]).lower()
                if "platformtype." in val:
                    val = val.split("platformtype.", 1)[1]
                data["platform"] = val
            if model in (Engagement, Vote) and data.get("engagement_type"):
                val = str(data["engagement_type"]).lower()
                if "engagementtype." in val:
                    val = val.split("engagementtype.", 1)[1]
                data["engagement_type"] = val
            rows.append(data)
    return rows


def main():
    target_engine = create_engine(TARGET_DATABASE_URL, future=True)

    # Ensure tables exist on target
    Base.metadata.create_all(target_engine)

    TargetSession = sessionmaker(target_engine)

    # Copy in dependency order
    models = [Campaign, Post, Follower, Engagement, Vote]

    for model in models:
        data = _rows(model)
        if not data:
            print(f"{model.__tablename__}: no rows to copy")
            continue

        with TargetSession() as session:
            session.execute(model.__table__.delete())
            session.execute(insert(model).values(data))
            session.commit()
            print(f"{model.__tablename__}: copied {len(data)} rows")

    # Fix sequences so future inserts use the next id
    with target_engine.begin() as conn:
        for table in ["campaigns", "posts", "followers", "engagements", "votes"]:
            conn.execute(
                text(
                    "SELECT setval(pg_get_serial_sequence(:table, 'id'), "
                    "COALESCE((SELECT MAX(id) FROM " + table + "), 1), true)"
                ),
                {"table": table},
            )
            print(f"{table}: sequence adjusted")

    target_engine.dispose()
    print("Migration complete.")


if __name__ == "__main__":
    main()
