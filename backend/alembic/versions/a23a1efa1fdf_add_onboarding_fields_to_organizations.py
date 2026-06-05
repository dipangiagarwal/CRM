"""add onboarding fields to organizations

Revision ID: a23a1efa1fdf
Revises: 98c056e1dd40
Create Date: 2026-06-05

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a23a1efa1fdf'
down_revision: Union[str, None] = '98c056e1dd40'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('organizations',
        sa.Column('industry', sa.Text(), nullable=True)
    )
    op.add_column('organizations',
        sa.Column('company_size', sa.Text(), nullable=True)
    )
    op.add_column('organizations',
        sa.Column('onboarding_completed', sa.Boolean(), default=False, nullable=True)
    )


def downgrade() -> None:
    op.drop_column('organizations', 'industry')
    op.drop_column('organizations', 'company_size')
    op.drop_column('organizations', 'onboarding_completed')