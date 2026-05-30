"""add logo_url to organizations

Revision ID: 98c056e1dd40
Revises: 6b09932ba98c
Create Date: 2026-05-30

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '98c056e1dd40'
down_revision: Union[str, None] = '6b09932ba98c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('organizations',
        sa.Column('logo_url', sa.Text(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('organizations', 'logo_url')