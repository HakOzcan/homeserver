"""
Add content_type to content table
Revision ID: ab82beff1253
Revises: 051a44d5dd0a
Create Date: 2026-05-06 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'ab82beff1253'
down_revision: Union[str, Sequence[str], None] = '051a44d5dd0a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("content", sa.Column("content_type", sa.String(), nullable=False, server_default="movie"))

def downgrade() -> None:
    op.drop_column("content", "content_type")