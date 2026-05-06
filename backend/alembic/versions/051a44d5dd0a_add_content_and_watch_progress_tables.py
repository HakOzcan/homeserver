"""add content and watch_progress tables

Revision ID: 051a44d5dd0a
Revises: 
Create Date: 2026-05-01 18:30:51.753885

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '051a44d5dd0a'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "content",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("tmdb_id", sa.Integer(), unique=True, index=True, nullable=False),
        sa.Column("content_type", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("overview", sa.Text(), nullable=True),
        sa.Column("genres", sa.JSON(), nullable=True),
        sa.Column("cast", sa.JSON(), nullable=True),
        sa.Column("rating", sa.Float(), nullable=True),
        sa.Column("release_year", sa.Integer(), nullable=True),
        sa.Column("runtime", sa.Integer(), nullable=True),
        sa.Column("original_filename", sa.String(), nullable=True),
        sa.Column("folder_name", sa.String(), nullable=False),
        sa.Column("added_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "watch_progress",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("content_id", sa.Integer(), sa.ForeignKey("content.id"), nullable=False),
        sa.Column("position_seconds", sa.Float(), nullable=False, server_default="0"),
        sa.Column("duration_seconds", sa.Float(), nullable=False, server_default="0"),
        sa.Column("completed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("user_id", "content_id", name="uq_user_content_progress"),
    )

def downgrade() -> None:
    op.drop_table("watch_progress")
    op.drop_table("content")
