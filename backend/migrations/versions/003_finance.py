"""Phase 3 migration - Finance Module

Revision ID: 003
Revises: 002
Create Date: 2026-03-01

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '003'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create cost_sheets table
    op.create_table(
        'cost_sheets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organisation_id', sa.Integer(), nullable=False),
        sa.Column('project_name', sa.String(length=255), nullable=False),
        sa.Column('tower', sa.String(length=50), nullable=True),
        sa.Column('unit_type', sa.String(length=50), nullable=False),
        sa.Column('area_sqft', sa.Float(), nullable=True),
        sa.Column('area_sqmt', sa.Float(), nullable=True),
        sa.Column('base_rate', sa.Float(), nullable=False),
        sa.Column('floor_premium_rate', sa.Float(), nullable=True),
        sa.Column('plc_amount', sa.Float(), nullable=True),
        sa.Column('parking_charge', sa.Float(), nullable=True),
        sa.Column('club_membership', sa.Float(), nullable=True),
        sa.Column('other_charges', sa.Float(), nullable=True),
        sa.Column('gst_percentage', sa.Float(), nullable=True),
        sa.Column('stamp_duty_percentage', sa.Float(), nullable=True),
        sa.Column('registration_percentage', sa.Float(), nullable=True),
        sa.Column('total_base_price', sa.Float(), nullable=False),
        sa.Column('total_tax', sa.Float(), nullable=False),
        sa.Column('grand_total', sa.Float(), nullable=False),
        sa.Column('version', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['organisation_id'], ['organisations.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_cost_sheets_id'), 'cost_sheets', ['id'], unique=False)

    # Create quotations table
    op.create_table(
        'quotations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organisation_id', sa.Integer(), nullable=False),
        sa.Column('lead_id', sa.Integer(), nullable=False),
        sa.Column('contact_id', sa.Integer(), nullable=True),
        sa.Column('cost_sheet_id', sa.Integer(), nullable=True),
        sa.Column('quotation_number', sa.String(length=50), nullable=False),
        sa.Column('version', sa.Integer(), nullable=True),
        sa.Column('customer_name', sa.String(length=255), nullable=False),
        sa.Column('customer_email', sa.String(length=255), nullable=True),
        sa.Column('customer_phone', sa.String(length=20), nullable=True),
        sa.Column('customer_address', sa.Text(), nullable=True),
        sa.Column('project_name', sa.String(length=255), nullable=False),
        sa.Column('tower', sa.String(length=50), nullable=True),
        sa.Column('unit_number', sa.String(length=50), nullable=True),
        sa.Column('unit_type', sa.String(length=50), nullable=False),
        sa.Column('area_sqft', sa.Float(), nullable=True),
        sa.Column('base_price', sa.Float(), nullable=False),
        sa.Column('floor_premium', sa.Float(), nullable=True),
        sa.Column('plc', sa.Float(), nullable=True),
        sa.Column('parking', sa.Float(), nullable=True),
        sa.Column('club_membership', sa.Float(), nullable=True),
        sa.Column('other_charges', sa.Float(), nullable=True),
        sa.Column('gst_amount', sa.Float(), nullable=False),
        sa.Column('stamp_duty', sa.Float(), nullable=True),
        sa.Column('registration', sa.Float(), nullable=True),
        sa.Column('total', sa.Float(), nullable=False),
        sa.Column('valid_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('terms_conditions', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['organisation_id'], ['organisations.id'], ),
        sa.ForeignKeyConstraint(['lead_id'], ['leads.id'], ),
        sa.ForeignKeyConstraint(['contact_id'], ['contacts.id'], ),
        sa.ForeignKeyConstraint(['cost_sheet_id'], ['cost_sheets.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_quotations_id'), 'quotations', ['id'], unique=False)
    op.create_index(op.f('ix_quotations_quotation_number'), 'quotations', ['quotation_number'], unique=True)

    # Create bookings table
    op.create_table(
        'bookings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organisation_id', sa.Integer(), nullable=False),
        sa.Column('lead_id', sa.Integer(), nullable=False),
        sa.Column('contact_id', sa.Integer(), nullable=True),
        sa.Column('quotation_id', sa.Integer(), nullable=True),
        sa.Column('booking_number', sa.String(length=50), nullable=False),
        sa.Column('booking_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('booking_amount', sa.Float(), nullable=False),
        sa.Column('project_name', sa.String(length=255), nullable=False),
        sa.Column('tower', sa.String(length=50), nullable=True),
        sa.Column('unit_number', sa.String(length=50), nullable=True),
        sa.Column('unit_type', sa.String(length=50), nullable=False),
        sa.Column('area_sqft', sa.Float(), nullable=True),
        sa.Column('customer_name', sa.String(length=255), nullable=False),
        sa.Column('customer_email', sa.String(length=255), nullable=True),
        sa.Column('customer_phone', sa.String(length=20), nullable=True),
        sa.Column('customer_address', sa.Text(), nullable=True),
        sa.Column('agreement_value', sa.Float(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('pan_card', sa.Boolean(), nullable=True),
        sa.Column('aadhar_card', sa.Boolean(), nullable=True),
        sa.Column('photo', sa.Boolean(), nullable=True),
        sa.Column('address_proof', sa.Boolean(), nullable=True),
        sa.Column('bank_details', sa.Boolean(), nullable=True),
        sa.Column('agreement_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('agreement_number', sa.String(length=50), nullable=True),
        sa.Column('registration_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('registration_number', sa.String(length=50), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['organisation_id'], ['organisations.id'], ),
        sa.ForeignKeyConstraint(['lead_id'], ['leads.id'], ),
        sa.ForeignKeyConstraint(['contact_id'], ['contacts.id'], ),
        sa.ForeignKeyConstraint(['quotation_id'], ['quotations.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_bookings_id'), 'bookings', ['id'], unique=False)
    op.create_index(op.f('ix_bookings_booking_number'), 'bookings', ['booking_number'], unique=True)

    # Create invoices table
    op.create_table(
        'invoices',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organisation_id', sa.Integer(), nullable=False),
        sa.Column('booking_id', sa.Integer(), nullable=False),
        sa.Column('invoice_number', sa.String(length=50), nullable=False),
        sa.Column('invoice_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('customer_name', sa.String(length=255), nullable=False),
        sa.Column('customer_email', sa.String(length=255), nullable=True),
        sa.Column('customer_address', sa.Text(), nullable=True),
        sa.Column('project_name', sa.String(length=255), nullable=False),
        sa.Column('unit_number', sa.String(length=50), nullable=True),
        sa.Column('total_amount', sa.Float(), nullable=False),
        sa.Column('paid_amount', sa.Float(), nullable=True),
        sa.Column('balance_amount', sa.Float(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('milestone_name', sa.String(length=100), nullable=True),
        sa.Column('milestone_percentage', sa.Float(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['organisation_id'], ['organisations.id'], ),
        sa.ForeignKeyConstraint(['booking_id'], ['bookings.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_invoices_id'), 'invoices', ['id'], unique=False)
    op.create_index(op.f('ix_invoices_invoice_number'), 'invoices', ['invoice_number'], unique=True)

    # Create payments table
    op.create_table(
        'payments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organisation_id', sa.Integer(), nullable=False),
        sa.Column('booking_id', sa.Integer(), nullable=False),
        sa.Column('invoice_id', sa.Integer(), nullable=True),
        sa.Column('payment_number', sa.String(length=50), nullable=False),
        sa.Column('payment_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('payment_method', sa.String(length=20), nullable=False),
        sa.Column('reference_number', sa.String(length=100), nullable=True),
        sa.Column('bank_name', sa.String(length=100), nullable=True),
        sa.Column('cheque_number', sa.String(length=50), nullable=True),
        sa.Column('receipt_number', sa.String(length=50), nullable=True),
        sa.Column('receipt_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['organisation_id'], ['organisations.id'], ),
        sa.ForeignKeyConstraint(['booking_id'], ['bookings.id'], ),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_payments_id'), 'payments', ['id'], unique=False)
    op.create_index(op.f('ix_payments_payment_number'), 'payments', ['payment_number'], unique=True)

    # Create payment_schedules table
    op.create_table(
        'payment_schedules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organisation_id', sa.Integer(), nullable=False),
        sa.Column('booking_id', sa.Integer(), nullable=False),
        sa.Column('milestone_name', sa.String(length=100), nullable=False),
        sa.Column('milestone_percentage', sa.Float(), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_invoiced', sa.Boolean(), nullable=True),
        sa.Column('is_paid', sa.Boolean(), nullable=True),
        sa.Column('invoice_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['organisation_id'], ['organisations.id'], ),
        sa.ForeignKeyConstraint(['booking_id'], ['bookings.id'], ),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_payment_schedules_id'), 'payment_schedules', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_payment_schedules_id'), table_name='payment_schedules')
    op.drop_table('payment_schedules')
    op.drop_index(op.f('ix_payments_payment_number'), table_name='payments')
    op.drop_index(op.f('ix_payments_id'), table_name='payments')
    op.drop_table('payments')
    op.drop_index(op.f('ix_invoices_invoice_number'), table_name='invoices')
    op.drop_index(op.f('ix_invoices_id'), table_name='invoices')
    op.drop_table('invoices')
    op.drop_index(op.f('ix_bookings_booking_number'), table_name='bookings')
    op.drop_index(op.f('ix_bookings_id'), table_name='bookings')
    op.drop_table('bookings')
    op.drop_index(op.f('ix_quotations_quotation_number'), table_name='quotations')
    op.drop_index(op.f('ix_quotations_id'), table_name='quotations')
    op.drop_table('quotations')
    op.drop_index(op.f('ix_cost_sheets_id'), table_name='cost_sheets')
    op.drop_table('cost_sheets')
