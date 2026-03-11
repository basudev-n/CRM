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


class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class ProjectType(str, enum.Enum):
    RESIDENTIAL = "residential"
    COMMERCIAL = "commercial"
    MIXED = "mixed"


class ProjectStatus(str, enum.Enum):
    PRE_LAUNCH = "pre_launch"
    LAUNCH = "launch"
    UNDER_CONSTRUCTION = "under_construction"
    READY_TO_MOVE = "ready_to_move"
    COMPLETED = "completed"


class UnitType(str, enum.Enum):
    _1BHK = "1bhk"
    _2BHK = "2bhk"
    _3BHK = "3bhk"
    _4BHK = "4bhk"
    _5BHK = "5bhk"
    PENTHOUSE = "penthouse"
    VILLA = "villa"
    PLOT = "plot"
    SHOP = "shop"
    OFFICE = "office"


class UnitStatus(str, enum.Enum):
    AVAILABLE = "available"
    BLOCKED = "blocked"
    BOOKED = "booked"
    REGISTERED = "registered"
    SOLD = "sold"


class Facing(str, enum.Enum):
    NORTH = "north"
    SOUTH = "south"
    EAST = "east"
    WEST = "west"
    NORTH_EAST = "north_east"
    NORTH_WEST = "north_west"
    SOUTH_EAST = "south_east"
    SOUTH_WEST = "south_west"


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
    subscription = relationship("Subscription", back_populates="organisation", uselist=False)


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
    # OAuth
    google_id = Column(String(100), nullable=True, unique=True, index=True)
    # Onboarding tracking
    has_seen_tour = Column(Boolean, default=False)
    onboarding_dismissed = Column(Boolean, default=False)
    first_login_at = Column(DateTime(timezone=True), nullable=True)
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


class UserInvite(Base):
    __tablename__ = "user_invites"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), index=True, nullable=False)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.AGENT)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=True)
    invite_token = Column(String(100), unique=True, index=True, nullable=False)
    invited_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    organisation = relationship("Organisation")
    inviter = relationship("User")


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
    activity_metadata = Column("metadata", Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    lead = relationship("Lead", back_populates="activities")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=True)
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
    # Recurring fields
    is_recurring = Column(Boolean, default=False)
    recurrence_pattern = Column(String(50), nullable=True)  # daily, weekly, monthly
    recurrence_interval = Column(Integer, default=1)
    parent_task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
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
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=True)
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
    notification_type = Column(String(50), nullable=False, default="lead_assigned")
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=True)
    link = Column(String(500), nullable=True)
    notification_metadata = Column("metadata", Text, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(255), nullable=False)
    entity_type = Column(String(100), nullable=False)
    entity_id = Column(Integer, nullable=True)
    endpoint = Column(String(500), nullable=False)
    method = Column(String(10), nullable=False)
    status_code = Column(Integer, nullable=False)
    ip_address = Column(String(100), nullable=True)
    user_agent = Column(String(500), nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


# Finance Models
class CostSheet(Base):
    __tablename__ = "cost_sheets"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    project_name = Column(String(255), nullable=False)
    tower = Column(String(50), nullable=True)
    unit_type = Column(String(50), nullable=False)
    area_sqft = Column(Float, nullable=True)
    area_sqmt = Column(Float, nullable=True)
    base_rate = Column(Float, nullable=False)
    floor_premium_rate = Column(Float, nullable=True)
    plc_amount = Column(Float, nullable=True)
    parking_charge = Column(Float, nullable=True)
    club_membership = Column(Float, nullable=True)
    other_charges = Column(Float, nullable=True)
    gst_percentage = Column(Float, default=5.0)
    stamp_duty_percentage = Column(Float, nullable=True)
    registration_percentage = Column(Float, nullable=True)
    total_base_price = Column(Float, nullable=False)
    total_tax = Column(Float, nullable=False)
    grand_total = Column(Float, nullable=False)
    version = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=func.now())


class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=True)
    cost_sheet_id = Column(Integer, ForeignKey("cost_sheets.id"), nullable=True)
    quotation_number = Column(String(50), unique=True, nullable=False)
    version = Column(Integer, default=1)
    customer_name = Column(String(255), nullable=False)
    customer_email = Column(String(255), nullable=True)
    customer_phone = Column(String(20), nullable=True)
    customer_address = Column(Text, nullable=True)
    project_name = Column(String(255), nullable=False)
    tower = Column(String(50), nullable=True)
    unit_number = Column(String(50), nullable=True)
    unit_type = Column(String(50), nullable=False)
    area_sqft = Column(Float, nullable=True)
    base_price = Column(Float, nullable=False)
    floor_premium = Column(Float, nullable=True)
    plc = Column(Float, nullable=True)
    parking = Column(Float, nullable=True)
    club_membership = Column(Float, nullable=True)
    other_charges = Column(Float, nullable=True)
    gst_amount = Column(Float, nullable=False)
    stamp_duty = Column(Float, nullable=True)
    registration = Column(Float, nullable=True)
    total = Column(Float, nullable=False)
    valid_until = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(20), default="draft")
    terms_conditions = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=func.now())


class QuotationShare(Base):
    __tablename__ = "quotation_shares"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    quotation_id = Column(Integer, ForeignKey("quotations.id"), nullable=False)
    token = Column(String(64), unique=True, nullable=False, index=True)
    status = Column(String(20), default="pending")
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=func.now())

    organisation = relationship("Organisation")
    quotation = relationship("Quotation")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=True)
    quotation_id = Column(Integer, ForeignKey("quotations.id"), nullable=True)
    booking_number = Column(String(50), unique=True, nullable=False)
    booking_date = Column(DateTime(timezone=True), nullable=False)
    booking_amount = Column(Float, nullable=False)
    project_name = Column(String(255), nullable=False)
    tower = Column(String(50), nullable=True)
    unit_number = Column(String(50), nullable=True)
    unit_type = Column(String(50), nullable=False)
    area_sqft = Column(Float, nullable=True)
    customer_name = Column(String(255), nullable=False)
    customer_email = Column(String(255), nullable=True)
    customer_phone = Column(String(20), nullable=True)
    customer_address = Column(Text, nullable=True)
    agreement_value = Column(Float, nullable=False)
    status = Column(String(20), default="booked")
    pan_card = Column(Boolean, default=False)
    aadhar_card = Column(Boolean, default=False)
    photo = Column(Boolean, default=False)
    address_proof = Column(Boolean, default=False)
    bank_details = Column(Boolean, default=False)
    agreement_date = Column(DateTime(timezone=True), nullable=True)
    agreement_number = Column(String(50), nullable=True)
    registration_date = Column(DateTime(timezone=True), nullable=True)
    registration_number = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=func.now())


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    invoice_number = Column(String(50), unique=True, nullable=False)
    invoice_date = Column(DateTime(timezone=True), nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=True)
    customer_name = Column(String(255), nullable=False)
    customer_email = Column(String(255), nullable=True)
    customer_address = Column(Text, nullable=True)
    project_name = Column(String(255), nullable=False)
    unit_number = Column(String(50), nullable=True)
    total_amount = Column(Float, nullable=False)
    paid_amount = Column(Float, default=0)
    balance_amount = Column(Float, nullable=False)
    status = Column(String(20), default="draft")
    milestone_name = Column(String(100), nullable=True)
    milestone_percentage = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=func.now())


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
    bank_name = Column(String(100), nullable=True)
    cheque_number = Column(String(50), nullable=True)
    receipt_number = Column(String(50), nullable=True)
    receipt_date = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PaymentSchedule(Base):
    __tablename__ = "payment_schedules"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    milestone_name = Column(String(100), nullable=False)
    milestone_percentage = Column(Float, nullable=False)
    amount = Column(Float, nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=True)
    is_invoiced = Column(Boolean, default=False)
    is_paid = Column(Boolean, default=False)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# Inventory Models
class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    name = Column(String(200), nullable=False)
    project_type = Column(String(20), nullable=False)  # residential/commercial/mixed
    rera_number = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    pin = Column(String(10), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    status = Column(String(30), default="pre_launch")  # pre_launch/launch/under_construction/ready_to_move/completed
    description = Column(Text, nullable=True)
    master_plan = Column(String(500), nullable=True)  # URL
    brochure = Column(String(500), nullable=True)  # URL
    gallery = Column(Text, nullable=True)  # JSON array of image URLs
    amenities = Column(Text, nullable=True)  # JSON array of amenities
    completion_timeline = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Tower(Base):
    __tablename__ = "towers"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    name = Column(String(50), nullable=False)  # Tower A, B, C, etc.
    floors_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Unit(Base):
    __tablename__ = "units"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    tower_id = Column(Integer, ForeignKey("towers.id"), nullable=False)
    floor = Column(Integer, nullable=False)
    unit_number = Column(String(20), nullable=False)  # 101, 102, etc.
    unit_type = Column(String(20), nullable=False)  # 1bhk, 2bhk, 3bhk, penthouse, etc.
    carpet_area = Column(Float, nullable=True)  # sq ft
    built_up_area = Column(Float, nullable=True)  # sq ft
    super_built_up_area = Column(Float, nullable=True)  # sq ft
    facing = Column(String(20), nullable=True)  # north, south, east, west
    floor_premium = Column(Float, default=0)
    base_price = Column(Float, default=0)  # per sq ft
    total_price = Column(Float, nullable=True)  # calculated
    status = Column(String(20), default="available")  # available/blocked/booked/registered/sold
    linked_lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)
    linked_booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True)
    hold_until = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ReportTemplate(Base):
    __tablename__ = "report_templates"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    name = Column(String(255), nullable=False)
    entity = Column(String(50), nullable=False)  # leads, contacts, bookings, etc.
    config = Column(Text, nullable=False)  # JSON configuration
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), unique=True, nullable=False)
    plan = Column(String(50), nullable=False, default="starter")  # starter, growth, scale, enterprise
    status = Column(String(50), nullable=False, default="trialing")  # trialing, active, past_due, canceled, paused
    max_users = Column(Integer, default=5)
    max_projects = Column(Integer, default=2)
    trial_ends_at = Column(DateTime(timezone=True), nullable=True)
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    razorpay_subscription_id = Column(String(100), nullable=True)
    razorpay_customer_id = Column(String(100), nullable=True)
    cancel_at_period_end = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    organisation = relationship("Organisation", back_populates="subscription")


class PaymentHistory(Base):
    __tablename__ = "payment_history"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=True)
    razorpay_payment_id = Column(String(100), nullable=True)
    razorpay_order_id = Column(String(100), nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR")
    status = Column(String(50), nullable=False)  # captured, failed, refunded
    plan = Column(String(50), nullable=True)
    billing_period_start = Column(DateTime(timezone=True), nullable=True)
    billing_period_end = Column(DateTime(timezone=True), nullable=True)
    invoice_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
