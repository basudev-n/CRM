from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


# Enums
class UserRole(str, enum.Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MANAGER = "manager"
    AGENT = "agent"
    FINANCE = "finance"
    VIEWER = "viewer"


class OrganisationType(str, enum.Enum):
    DEVELOPER = "developer"
    BROKER = "broker"
    BOTH = "both"


# Models
class Organisation(Base):
    __tablename__ = "organisations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    type = Column(Enum(OrganisationType), default=OrganisationType.DEVELOPER)
    rera_number = Column(String(50), nullable=True)
    logo = Column(String(500), nullable=True)
    timezone = Column(String(50), default="Asia/Kolkata")
    currency = Column(String(10), default="INR")
    gstin = Column(String(20), nullable=True)
    pan = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    memberships = relationship("OrgMembership", back_populates="organisation")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    avatar = Column(String(500), nullable=True)
    is_email_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    memberships = relationship("OrgMembership", back_populates="user")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(500), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="refresh_tokens")


class EmailOTP(Base):
    __tablename__ = "email_otps"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), index=True, nullable=False)
    otp = Column(String(6), nullable=False)
    purpose = Column(String(50), default="signup")  # signup, login, forgot_password
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class OrgMembership(Base):
    __tablename__ = "org_memberships"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.AGENT)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="memberships")
    organisation = relationship("Organisation", back_populates="memberships")


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    alternate_phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    dob = Column(DateTime, nullable=True)
    contact_type = Column(String(50), default="prospect")
    tags = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class LeadSource(Base):
    __tablename__ = "lead_sources"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    name = Column(String(100), nullable=False)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=True)
    source_id = Column(Integer, ForeignKey("lead_sources.id"), nullable=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    source = Column(String(100), nullable=True)
    project_interest = Column(String(500), nullable=True)
    unit_type_preference = Column(String(50), nullable=True)
    budget_min = Column(Float, nullable=True)
    budget_max = Column(Float, nullable=True)
    possession_timeline = Column(String(50), nullable=True)
    priority = Column(String(20), default="medium")
    status = Column(String(50), default="new")
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    score = Column(Integer, default=0)
    notes = Column(Text, nullable=True)
    lost_reason = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=func.now())

    activities = relationship("Activity", back_populates="lead")


class PipelineStage(Base):
    __tablename__ = "pipeline_stages"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    name = Column(String(100), nullable=False)
    color = Column(String(20), default="#6366f1")
    order = Column(Integer, default=0)
    is_won = Column(Boolean, default=False)
    is_lost = Column(Boolean, default=False)


class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    activity_type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    lead = relationship("Lead", back_populates="activities")

    lead = relationship("Lead", back_populates="activities")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    task_type = Column(String(50), default="follow_up")
    priority = Column(String(20), default="medium")
    status = Column(String(20), default="pending")
    due_date = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    completion_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    assignee = relationship("User", foreign_keys=[assignee_id])
    created_by = relationship("User", foreign_keys=[created_by_id])


class SiteVisit(Base):
    __tablename__ = "site_visits"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    scheduled_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_agent_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    scheduled_date = Column(DateTime(timezone=True), nullable=False)
    project_name = Column(String(255), nullable=True)
    location = Column(Text, nullable=True)
    remarks = Column(Text, nullable=True)
    outcome = Column(String(50), nullable=True)
    feedback = Column(Text, nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    is_pinned = Column(Boolean, default=False)
    mentions = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=True)
    link = Column(String(500), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# Finance Models
class CostSheet(Base):
    __tablename__ = "cost_sheets"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    project_name = Column(String(255), nullable=False)
    tower = Column(String(50), nullable=True)
    unit_type = Column(String(50), nullable=False)
    area_sqft = Column(Float, nullable=True)
    base_rate = Column(Float, nullable=False)
    floor_premium_rate = Column(Float, nullable=True)
    plc_amount = Column(Float, nullable=True)
    parking_charge = Column(Float, nullable=True)
    club_membership = Column(Float, nullable=True)
    gst_percentage = Column(Float, default=5.0)
    total_base_price = Column(Float, nullable=False)
    total_tax = Column(Float, nullable=False)
    grand_total = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    quotation_number = Column(String(50), unique=True, nullable=False)
    customer_name = Column(String(255), nullable=False)
    customer_email = Column(String(255), nullable=True)
    project_name = Column(String(255), nullable=False)
    unit_type = Column(String(50), nullable=False)
    base_price = Column(Float, nullable=False)
    gst_amount = Column(Float, nullable=False)
    total = Column(Float, nullable=False)
    status = Column(String(20), default="draft")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    booking_number = Column(String(50), unique=True, nullable=False)
    booking_date = Column(DateTime(timezone=True), nullable=False)
    booking_amount = Column(Float, nullable=False)
    project_name = Column(String(255), nullable=False)
    unit_type = Column(String(50), nullable=False)
    customer_name = Column(String(255), nullable=False)
    agreement_value = Column(Float, nullable=False)
    status = Column(String(20), default="booked")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    invoice_number = Column(String(50), unique=True, nullable=False)
    invoice_date = Column(DateTime(timezone=True), nullable=False)
    customer_name = Column(String(255), nullable=False)
    project_name = Column(String(255), nullable=False)
    total_amount = Column(Float, nullable=False)
    paid_amount = Column(Float, default=0)
    balance_amount = Column(Float, nullable=False)
    status = Column(String(20), default="draft")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    payment_number = Column(String(50), unique=True, nullable=False)
    payment_date = Column(DateTime(timezone=True), nullable=False)
    amount = Column(Float, nullable=False)
    payment_method = Column(String(20), nullable=False)
    reference_number = Column(String(100), nullable=True)
    receipt_number = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PaymentSchedule(Base):
    __tablename__ = "payment_schedules"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    milestone_name = Column(String(100), nullable=False)
    amount = Column(Float, nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=True)
    is_paid = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
