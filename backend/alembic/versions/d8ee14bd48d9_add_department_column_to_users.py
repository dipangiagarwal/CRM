"""add department column to users

Revision ID: d8ee14bd48d9
Revises: a23a1efa1fdf
Create Date: 2026-06-24 14:26:22.704806

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd8ee14bd48d9'
down_revision: Union[str, None] = 'a23a1efa1fdf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('department', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'department')