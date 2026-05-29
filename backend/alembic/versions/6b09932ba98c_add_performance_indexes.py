"""add performance indexes

Revision ID: 6b09932ba98c
Revises: bb5295185de6
Create Date: 2026-05-27

"""
from typing import Sequence, Union
from alembic import op

revision: str = '6b09932ba98c'
down_revision: Union[str, None] = '3406c2657e31'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Contacts indexes
    op.create_index('idx_contacts_org', 'contacts', ['org_id'])
    op.create_index('idx_contacts_owner', 'contacts', ['org_id', 'owner_id'])
    op.create_index('idx_contacts_stage', 'contacts', ['org_id', 'lifecycle_stage'])
    op.create_index('idx_contacts_created', 'contacts', ['org_id', 'created_at'])

    # Deals indexes
    op.create_index('idx_deals_org', 'deals', ['org_id'])
    op.create_index('idx_deals_stage', 'deals', ['org_id', 'stage'])
    op.create_index('idx_deals_owner', 'deals', ['org_id', 'owner_id'])
    op.create_index('idx_deals_contact', 'deals', ['contact_id'])

    # Activities indexes
    op.create_index('idx_activities_org', 'activities', ['org_id'])
    op.create_index('idx_activities_contact', 'activities', ['contact_id'])
    op.create_index('idx_activities_deal', 'activities', ['deal_id'])

    # Users indexes
    op.create_index('idx_users_org', 'users', ['org_id', 'is_active'])
    op.create_index('idx_users_email', 'users', ['email'])

    # Billing indexes
    op.create_index('idx_billing_org', 'billing', ['org_id'])
    op.create_index('idx_billing_order', 'billing', ['razorpay_order_id'])

    # Audit log indexes
    op.create_index('idx_audit_org', 'audit_log', ['org_id'])
    op.create_index('idx_audit_user', 'audit_log', ['user_id'])

    # Files indexes
    op.create_index('idx_files_org', 'files', ['org_id'])
    op.create_index('idx_files_contact', 'files', ['contact_id'])
    op.create_index('idx_files_deal', 'files', ['deal_id'])


def downgrade() -> None:
    # Contacts
    op.drop_index('idx_contacts_org')
    op.drop_index('idx_contacts_owner')
    op.drop_index('idx_contacts_stage')
    op.drop_index('idx_contacts_created')

    # Deals
    op.drop_index('idx_deals_org')
    op.drop_index('idx_deals_stage')
    op.drop_index('idx_deals_owner')
    op.drop_index('idx_deals_contact')

    # Activities
    op.drop_index('idx_activities_org')
    op.drop_index('idx_activities_contact')
    op.drop_index('idx_activities_deal')

    # Users
    op.drop_index('idx_users_org')
    op.drop_index('idx_users_email')

    # Billing
    op.drop_index('idx_billing_org')
    op.drop_index('idx_billing_order')

    # Audit log
    op.drop_index('idx_audit_org')
    op.drop_index('idx_audit_user')

    # Files
    op.drop_index('idx_files_org')
    op.drop_index('idx_files_contact')
    op.drop_index('idx_files_deal')