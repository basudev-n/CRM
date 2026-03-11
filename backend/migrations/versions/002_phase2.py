"""Phase 2 migration - Pipeline, Activities, Tasks, Visits, Notes, Notifications

Revision ID: 002
Revises: 001
Create Date: 2026-02-28

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Define column types with sqlite fallback
    engine = op.get_bind()
    if engine.dialect.name == 'sqlite':
        activity_type_col = sa.String(length=50)
        task_type_col = sa.String(length=50)
        task_priority_col = sa.String(length=20)
        task_status_col = sa.String(length=20)
        notification_type_col = sa.String(length=50)
    else:
        # Create enum types first
        for ename, evalues in [
            ('activitytype', ('call', 'email', 'whatsapp', 'note', 'status_change', 'assignment', 'site_visit', 'task_completed', 'quotation', 'meeting')),
            ('tasktype', ('follow_up', 'call', 'email', 'send_document', 'internal', 'approval', 'other')),
            ('taskpriority', ('high', 'medium', 'low')),
            ('taskstatus', ('pending', 'in_progress', 'completed', 'cancelled')),
            ('notificationtype', ('task_assigned', 'task_due', 'task_completed', 'lead_assigned', 'lead_status_changed', 'site_visit_scheduled', 'site_visit_reminder', 'mention', 'lead_inactive')),
        ]:
            sa.Enum(*evalues, name=ename).create(op.get_bind(), checkfirst=True)
        activity_type_col = sa.Enum('call', 'email', 'whatsapp', 'note', 'status_change', 'assignment', 'site_visit', 'task_completed', 'quotation', 'meeting', name='activitytype', create_type=False)
        task_type_col = sa.Enum('follow_up', 'call', 'email', 'send_document', 'internal', 'approval', 'other', name='tasktype', create_type=False)
        task_priority_col = sa.Enum('high', 'medium', 'low', name='taskpriority', create_type=False)
        task_status_col = sa.Enum('pending', 'in_progress', 'completed', 'cancelled', name='taskstatus', create_type=False)
        notification_type_col = sa.Enum('task_assigned', 'task_due', 'task_completed', 'lead_assigned', 'lead_status_changed', 'site_visit_scheduled', 'site_visit_reminder', 'mention', 'lead_inactive', name='notificationtype', create_type=False)
    # Create pipeline_stages table
    op.create_table(
        'pipeline_stages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organisation_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('color', sa.String(length=20), nullable=True),
        sa.Column('order', sa.Integer(), nullable=True),
        sa.Column('is_default', sa.Boolean(), nullable=True),
        sa.Column('is_won', sa.Boolean(), nullable=True),
        sa.Column('is_lost', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['organisation_id'], ['organisations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_pipeline_stages_id'), 'pipeline_stages', ['id'], unique=False)

    # Create activities table
    op.create_table(
        'activities',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organisation_id', sa.Integer(), nullable=False),
        sa.Column('lead_id', sa.Integer(), nullable=True),
        sa.Column('contact_id', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('activity_type', activity_type_col, nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('metadata', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['organisation_id'], ['organisations.id'], ),
        sa.ForeignKeyConstraint(['lead_id'], ['leads.id'], ),
        sa.ForeignKeyConstraint(['contact_id'], ['contacts.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_activities_id'), 'activities', ['id'], unique=False)

    # Create tasks table
    op.create_table(
        'tasks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organisation_id', sa.Integer(), nullable=False),
        sa.Column('lead_id', sa.Integer(), nullable=True),
        sa.Column('contact_id', sa.Integer(), nullable=True),
        sa.Column('assignee_id', sa.Integer(), nullable=False),
        sa.Column('created_by_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('task_type', task_type_col, nullable=True),
        sa.Column('priority', task_priority_col, nullable=True),
        sa.Column('status', task_status_col, nullable=True),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completion_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['organisation_id'], ['organisations.id'], ),
        sa.ForeignKeyConstraint(['lead_id'], ['leads.id'], ),
        sa.ForeignKeyConstraint(['contact_id'], ['contacts.id'], ),
        sa.ForeignKeyConstraint(['assignee_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tasks_id'), 'tasks', ['id'], unique=False)

    # Create email_otps table (for OTP storage)
    op.create_table(
        'email_otps',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False, index=True),
        sa.Column('otp', sa.String(length=6), nullable=False),
        sa.Column('purpose', sa.String(length=50), nullable=True, server_default='signup'),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_verified', sa.Boolean(), nullable=True, server_default=sa.text('0')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_email_otps_id'), 'email_otps', ['id'], unique=False)

    # Create site_visits table
    op.create_table(
        'site_visits',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organisation_id', sa.Integer(), nullable=False),
        sa.Column('lead_id', sa.Integer(), nullable=False),
        sa.Column('scheduled_by', sa.Integer(), nullable=False),
        sa.Column('assigned_agent_id', sa.Integer(), nullable=False),
        sa.Column('scheduled_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('project_name', sa.String(length=255), nullable=True),
        sa.Column('location', sa.Text(), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('outcome', sa.String(length=50), nullable=True),
        sa.Column('feedback', sa.Text(), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['organisation_id'], ['organisations.id'], ),
        sa.ForeignKeyConstraint(['lead_id'], ['leads.id'], ),
        sa.ForeignKeyConstraint(['scheduled_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['assigned_agent_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_site_visits_id'), 'site_visits', ['id'], unique=False)

    # Create notes table
    op.create_table(
        'notes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organisation_id', sa.Integer(), nullable=False),
        sa.Column('lead_id', sa.Integer(), nullable=True),
        sa.Column('contact_id', sa.Integer(), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('is_pinned', sa.Boolean(), nullable=True),
        sa.Column('mentions', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['organisation_id'], ['organisations.id'], ),
        sa.ForeignKeyConstraint(['lead_id'], ['leads.id'], ),
        sa.ForeignKeyConstraint(['contact_id'], ['contacts.id'], ),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_notes_id'), 'notes', ['id'], unique=False)

    # Create notifications table
    op.create_table(
        'notifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('organisation_id', sa.Integer(), nullable=False),
        sa.Column('notification_type', notification_type_col, nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('link', sa.String(length=500), nullable=True),
        sa.Column('metadata', sa.Text(), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['organisation_id'], ['organisations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_notifications_id'), 'notifications', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_notifications_id'), table_name='notifications')
    op.drop_table('notifications')
    op.drop_index(op.f('ix_notes_id'), table_name='notes')
    op.drop_table('notes')
    op.drop_index(op.f('ix_site_visits_id'), table_name='site_visits')
    op.drop_table('site_visits')
    op.drop_index(op.f('ix_tasks_id'), table_name='tasks')
    op.drop_table('tasks')
    op.drop_index(op.f('ix_activities_id'), table_name='activities')
    op.drop_table('activities')
    op.drop_index(op.f('ix_pipeline_stages_id'), table_name='pipeline_stages')
    op.drop_table('pipeline_stages')

    # Drop enums
    op.execute('DROP TYPE IF EXISTS activitytype')
    op.execute('DROP TYPE IF EXISTS tasktype')
    op.execute('DROP TYPE IF EXISTS taskpriority')
    op.execute('DROP TYPE IF EXISTS taskstatus')
    op.execute('DROP TYPE IF EXISTS notificationtype')
