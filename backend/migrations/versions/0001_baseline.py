"""Baseline: the whole schema of Step 5 from database/schema.sql.

Later changes edit database/schema.dbml first, then add a migration here that applies the same change.

Revision ID: 0001
"""

from pathlib import Path

from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

SCHEMA = Path(__file__).resolve().parents[3] / "database" / "schema.sql"


def upgrade() -> None:
    op.execute(SCHEMA.read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
