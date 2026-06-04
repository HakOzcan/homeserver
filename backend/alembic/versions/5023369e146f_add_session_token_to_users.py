"""
Add session_token to users
Revision ID: 5023369e146f
Revises: ab82beff1253
Create Date: 2026-06-04 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '5023369e146f'
down_revision: Union[str, Sequence[str], None] = 'ab82beff1253'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("session_token", sa.String(), nullable=True))

def downgrade() -> None:
    op.drop_column("users", "session_token")