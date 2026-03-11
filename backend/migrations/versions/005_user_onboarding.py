"""Add user onboarding fields

Revision ID: 005
Revises: 004
Create Date: 2026-03-11

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add onboarding tracking fields to users table
    op.add_column('users', sa.Column('has_seen_tour', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('users', sa.Column('onboarding_dismissed', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('users', sa.Column('first_login_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'first_login_at')
    op.drop_column('users', 'onboarding_dismissed')
    op.drop_column('users', 'has_seen_tour')
