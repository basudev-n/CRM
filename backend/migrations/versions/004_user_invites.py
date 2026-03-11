"""Add user_invites table

Revision ID: 004
Revises: 003
Create Date: 2026-03-11

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '004'
down_revision: Union[str, None] = '003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Handle enum type for different databases
    from sqlalchemy import inspect
    engine = op.get_bind()
    
    if engine.dialect.name != 'sqlite':
        user_role_col = sa.Enum('owner', 'admin', 'manager', 'agent', 'finance', 'viewer', name='userrole', create_type=False)
    else:
        user_role_col = sa.String(length=20)

    # Create user_invites table
    op.create_table(
        'user_invites',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('organisation_id', sa.Integer(), nullable=False),
        sa.Column('role', user_role_col, nullable=True),
        sa.Column('first_name', sa.String(length=100), nullable=False),
        sa.Column('last_name', sa.String(length=100), nullable=True),
        sa.Column('invite_token', sa.String(length=100), nullable=False),
        sa.Column('invited_by', sa.Integer(), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='1'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['organisation_id'], ['organisations.id'], ),
        sa.ForeignKeyConstraint(['invited_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_invites_id'), 'user_invites', ['id'], unique=False)
    op.create_index(op.f('ix_user_invites_email'), 'user_invites', ['email'], unique=False)
    op.create_index(op.f('ix_user_invites_invite_token'), 'user_invites', ['invite_token'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_user_invites_invite_token'), table_name='user_invites')
    op.drop_index(op.f('ix_user_invites_email'), table_name='user_invites')
    op.drop_index(op.f('ix_user_invites_id'), table_name='user_invites')
    op.drop_table('user_invites')
