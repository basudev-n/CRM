"""Initial migration

Revision ID: 001
Revises:
Create Date: 2026-02-28

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum types
    user_role_enum = sa.Enum('owner', 'admin', 'manager', 'agent', 'finance', 'viewer', name='userrole')
    org_type_enum = sa.Enum('developer', 'broker', 'both', name='organisationtype')
    user_role_enum.create(op.get_bind(), checkfirst=True)
    org_type_enum.create(op.get_bind(), checkfirst=True)

    # Create organisations table
    op.create_table(
        'organisations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('type', sa.Enum('developer', 'broker', 'both', name='organisationtype'), nullable=True),
        sa.Column('rera_number', sa.String(length=50), nullable=True),
        sa.Column('logo', sa.String(length=500), nullable=True),
        sa.Column('cover_image', sa.String(length=500), nullable=True),
        sa.Column('timezone', sa.String(length=50), nullable=True),
        sa.Column('currency', sa.String(length=10), nullable=True),
        sa.Column('gstin', sa.String(length=20), nullable=True),
        sa.Column('pan', sa.String(length=20), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('business_hours', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_organisations_id'), 'organisations', ['id'], unique=False)

    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('first_name', sa.String(length=100), nullable=False),
        sa.Column('last_name', sa.String(length=100), nullable=True),
        sa.Column('phone', sa.String(length=20), nullable=True),
        sa.Column('avatar', sa.String(length=500), nullable=True),
        sa.Column('is_email_verified', sa.Boolean(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)

    # Create refresh_tokens table
    op.create_table(
        'refresh_tokens',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('token', sa.String(length=500), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_refresh_tokens_id'), 'refresh_tokens', ['id'], unique=False)
    op.create_index(op.f('ix_refresh_tokens_token'), 'refresh_tokens', ['token'], unique=True)

    # Create org_memberships table
    op.create_table(
        'org_memberships',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('organisation_id', sa.Integer(), nullable=False),
        sa.Column('role', sa.Enum('owner', 'admin', 'manager', 'agent', 'finance', 'viewer', name='userrole'), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['organisation_id'], ['organisations.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_org_memberships_id'), 'org_memberships', ['id'], unique=False)

    # Create contacts table
    op.create_table(
        'contacts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organisation_id', sa.Integer(), nullable=False),
        sa.Column('first_name', sa.String(length=100), nullable=False),
        sa.Column('last_name', sa.String(length=100), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('phone', sa.String(length=20), nullable=True),
        sa.Column('alternate_phone', sa.String(length=20), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('dob', sa.DateTime(timezone=True), nullable=True),
        sa.Column('contact_type', sa.String(length=50), nullable=True),
        sa.Column('tags', sa.String(length=500), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('assigned_to', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['organisation_id'], ['organisations.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['assigned_to'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_contacts_id'), 'contacts', ['id'], unique=False)

    # Create lead_sources table
    op.create_table(
        'lead_sources',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organisation_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('is_default', sa.Boolean(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['organisation_id'], ['organisations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_lead_sources_id'), 'lead_sources', ['id'], unique=False)

    # Create leads table
    op.create_table(
        'leads',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organisation_id', sa.Integer(), nullable=False),
        sa.Column('contact_id', sa.Integer(), nullable=True),
        sa.Column('source_id', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('phone', sa.String(length=20), nullable=True),
        sa.Column('source', sa.String(length=100), nullable=True),
        sa.Column('project_interest', sa.String(length=500), nullable=True),
        sa.Column('unit_type_preference', sa.String(length=50), nullable=True),
        sa.Column('budget_min', sa.Float(), nullable=True),
        sa.Column('budget_max', sa.Float(), nullable=True),
        sa.Column('possession_timeline', sa.String(length=100), nullable=True),
        sa.Column('priority', sa.String(length=20), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('assigned_to', sa.Integer(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('score', sa.Integer(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('lost_reason', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['organisation_id'], ['organisations.id'], ),
        sa.ForeignKeyConstraint(['contact_id'], ['contacts.id'], ),
        sa.ForeignKeyConstraint(['source_id'], ['lead_sources.id'], ),
        sa.ForeignKeyConstraint(['assigned_to'], ['users.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_leads_id'), 'leads', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_leads_id'), table_name='leads')
    op.drop_table('leads')
    op.drop_index(op.f('ix_lead_sources_id'), table_name='lead_sources')
    op.drop_table('lead_sources')
    op.drop_index(op.f('ix_contacts_id'), table_name='contacts')
    op.drop_table('contacts')
    op.drop_index(op.f('ix_org_memberships_id'), table_name='org_memberships')
    op.drop_table('org_memberships')
    op.drop_index(op.f('ix_refresh_tokens_token'), table_name='refresh_tokens')
    op.drop_index(op.f('ix_refresh_tokens_id'), table_name='refresh_tokens')
    op.drop_table('refresh_tokens')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
    op.drop_index(op.f('ix_organisations_id'), table_name='organisations')
    op.drop_table('organisations')

    # Drop enums
    op.execute('DROP TYPE IF EXISTS userrole')
    op.execute('DROP TYPE IF EXISTS organisationtype')
