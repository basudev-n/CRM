"""Add report templates and billing tables

Revision ID: 006
Revises: 005
Create Date: 2026-03-11

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade():
    # Report Templates table
    op.create_table(
        'report_templates',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('organisation_id', sa.Integer(), sa.ForeignKey('organisations.id'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('entity', sa.String(50), nullable=False),
        sa.Column('config', sa.Text(), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_report_templates_id', 'report_templates', ['id'])
    op.create_index('ix_report_templates_organisation_id', 'report_templates', ['organisation_id'])

    # Subscriptions table
    op.create_table(
        'subscriptions',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('organisation_id', sa.Integer(), sa.ForeignKey('organisations.id'), unique=True, nullable=False),
        sa.Column('plan', sa.String(50), nullable=False, default='starter'),
        sa.Column('status', sa.String(50), nullable=False, default='trialing'),
        sa.Column('max_users', sa.Integer(), default=5),
        sa.Column('max_projects', sa.Integer(), default=2),
        sa.Column('trial_ends_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('current_period_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('current_period_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('razorpay_subscription_id', sa.String(100), nullable=True),
        sa.Column('razorpay_customer_id', sa.String(100), nullable=True),
        sa.Column('cancel_at_period_end', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_subscriptions_id', 'subscriptions', ['id'])

    # Payment History table
    op.create_table(
        'payment_history',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('organisation_id', sa.Integer(), sa.ForeignKey('organisations.id'), nullable=False),
        sa.Column('subscription_id', sa.Integer(), sa.ForeignKey('subscriptions.id'), nullable=True),
        sa.Column('razorpay_payment_id', sa.String(100), nullable=True),
        sa.Column('razorpay_order_id', sa.String(100), nullable=True),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('currency', sa.String(10), default='INR'),
        sa.Column('status', sa.String(50), nullable=False),
        sa.Column('plan', sa.String(50), nullable=True),
        sa.Column('billing_period_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('billing_period_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('invoice_url', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_payment_history_id', 'payment_history', ['id'])
    op.create_index('ix_payment_history_organisation_id', 'payment_history', ['organisation_id'])


def downgrade():
    op.drop_table('payment_history')
    op.drop_table('subscriptions')
    op.drop_table('report_templates')
