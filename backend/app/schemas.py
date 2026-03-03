from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum


# ============== AUTH SCHEMAS ==============

class SignUpRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    first_name: str
    last_name: Optional[str] = None
    phone: Optional[str] = None


class SendOTPRequest(BaseModel):
    email: EmailStr
    purpose: str = "signup"  # signup, login, forgot_password


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)


class SignUpWithOTPRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)
    password: str = Field(..., min_length=8)
    first_name: str
    last_name: Optional[str] = None
    phone: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: Optional[str]
    phone: Optional[str]
    avatar: Optional[str]
    is_email_verified: bool

    class Config:
        from_attributes = True


class UserBrief(BaseModel):
    id: int
    first_name: str
    last_name: Optional[str]
    email: str

    class Config:
        from_attributes = True


# Organisation Schemas
class OrganisationCreate(BaseModel):
    name: str
    type: str = "developer"
    rera_number: Optional[str] = None
    timezone: str = "Asia/Kolkata"
    currency: str = "INR"


class OrganisationResponse(BaseModel):
    id: int
    name: str
    type: str
    rera_number: Optional[str]
    logo: Optional[str]
    cover_image: Optional[str]
    timezone: str
    currency: str
    gstin: Optional[str]
    pan: Optional[str]
    address: Optional[str]

    class Config:
        from_attributes = True


# Invite Schemas
class InviteUserRequest(BaseModel):
    email: EmailStr
    role: str = "agent"
    first_name: str
    last_name: Optional[str] = None


class InviteResponse(BaseModel):
    message: str
    invite_id: int


# Contact Schemas
class ContactCreate(BaseModel):
    first_name: str
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    address: Optional[str] = None
    dob: Optional[datetime] = None
    contact_type: str = "prospect"
    tags: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[int] = None


class ContactUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    address: Optional[str] = None
    dob: Optional[datetime] = None
    contact_type: Optional[str] = None
    tags: Optional[str] = None
    notes: Optional[str] = None


class ContactResponse(BaseModel):
    id: int
    first_name: str
    last_name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    alternate_phone: Optional[str]
    address: Optional[str]
    dob: Optional[datetime]
    contact_type: str
    tags: Optional[str]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# Lead Schemas
class LeadCreate(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    source: Optional[str] = None
    project_interest: Optional[str] = None
    unit_type_preference: Optional[str] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    possession_timeline: Optional[str] = None
    priority: str = "medium"
    notes: Optional[str] = None
    contact_id: Optional[int] = None
    assigned_to: Optional[int] = None


class LeadUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    source: Optional[str] = None
    project_interest: Optional[str] = None
    unit_type_preference: Optional[str] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    possession_timeline: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    lost_reason: Optional[str] = None
    assigned_to: Optional[int] = None
    score: Optional[int] = None


class LeadResponse(BaseModel):
    id: int
    name: str
    email: Optional[str]
    phone: Optional[str]
    source: Optional[str]
    project_interest: Optional[str]
    unit_type_preference: Optional[str]
    budget_min: Optional[float]
    budget_max: Optional[float]
    possession_timeline: Optional[str]
    priority: str
    status: str
    score: int
    notes: Optional[str]
    lost_reason: Optional[str]
    assigned_to: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


# Pipeline Stage Schemas
class PipelineStageCreate(BaseModel):
    name: str
    color: str = "#6366f1"
    order: int = 0
    is_won: bool = False
    is_lost: bool = False


class PipelineStageResponse(BaseModel):
    id: int
    name: str
    color: str
    order: int
    is_default: bool
    is_won: bool
    is_lost: bool

    class Config:
        from_attributes = True


class PipelineStageUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    order: Optional[int] = None
    is_won: Optional[bool] = None
    is_lost: Optional[bool] = None


# Activity Schemas
class ActivityCreate(BaseModel):
    lead_id: Optional[int] = None
    contact_id: Optional[int] = None
    activity_type: str
    title: str
    description: Optional[str] = None
    metadata: Optional[str] = None


class ActivityResponse(BaseModel):
    id: int
    lead_id: Optional[int]
    contact_id: Optional[int]
    user_id: int
    activity_type: str
    title: str
    description: Optional[str]
    created_at: datetime
    user: Optional[UserBrief] = None

    class Config:
        from_attributes = True


# Task Schemas
class TaskCreate(BaseModel):
    lead_id: Optional[int] = None
    contact_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    task_type: str = "follow_up"
    priority: str = "medium"
    assignee_id: int
    due_date: Optional[datetime] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    task_type: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[datetime] = None
    completion_notes: Optional[str] = None


class TaskResponse(BaseModel):
    id: int
    lead_id: Optional[int]
    contact_id: Optional[int]
    assignee_id: int
    created_by_id: int
    title: str
    description: Optional[str]
    task_type: str
    priority: str
    status: str
    due_date: Optional[datetime]
    completed_at: Optional[datetime]
    completion_notes: Optional[str]
    created_at: datetime
    assignee: Optional[UserBrief] = None
    lead: Optional[LeadResponse] = None

    class Config:
        from_attributes = True


# Site Visit Schemas
class SiteVisitCreate(BaseModel):
    lead_id: int
    scheduled_date: datetime
    project_name: Optional[str] = None
    location: Optional[str] = None
    remarks: Optional[str] = None
    assigned_agent_id: int


class SiteVisitUpdate(BaseModel):
    scheduled_date: Optional[datetime] = None
    project_name: Optional[str] = None
    location: Optional[str] = None
    remarks: Optional[str] = None
    assigned_agent_id: Optional[int] = None
    outcome: Optional[str] = None
    feedback: Optional[str] = None


class SiteVisitResponse(BaseModel):
    id: int
    lead_id: int
    scheduled_by: int
    assigned_agent_id: int
    scheduled_date: datetime
    project_name: Optional[str]
    location: Optional[str]
    remarks: Optional[str]
    outcome: Optional[str]
    feedback: Optional[str]
    completed_at: Optional[datetime]
    created_at: datetime
    lead: Optional[LeadResponse] = None

    class Config:
        from_attributes = True


# Note Schemas
class NoteCreate(BaseModel):
    lead_id: Optional[int] = None
    contact_id: Optional[int] = None
    content: str
    is_pinned: bool = False
    mentions: Optional[str] = None


class NoteUpdate(BaseModel):
    content: Optional[str] = None
    is_pinned: Optional[bool] = None
    mentions: Optional[str] = None


class NoteResponse(BaseModel):
    id: int
    lead_id: Optional[int]
    contact_id: Optional[int]
    created_by_id: int
    content: str
    is_pinned: bool
    mentions: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# Notification Schemas
class NotificationResponse(BaseModel):
    id: int
    user_id: int
    notification_type: str
    title: str
    message: Optional[str]
    link: Optional[str]
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ============== FINANCE SCHEMAS ==============

# Cost Sheet Schemas
class CostSheetCreate(BaseModel):
    project_name: str
    tower: Optional[str] = None
    unit_type: str
    area_sqft: Optional[float] = None
    area_sqmt: Optional[float] = None
    base_rate: float
    floor_premium_rate: Optional[float] = None
    plc_amount: Optional[float] = None
    parking_charge: Optional[float] = None
    club_membership: Optional[float] = None
    other_charges: Optional[float] = None
    gst_percentage: float = 5.0
    stamp_duty_percentage: float = 5.0
    registration_percentage: float = 1.0


class CostSheetResponse(BaseModel):
    id: int
    project_name: str
    tower: Optional[str]
    unit_type: str
    area_sqft: Optional[float]
    area_sqmt: Optional[float]
    base_rate: float
    floor_premium_rate: Optional[float]
    plc_amount: Optional[float]
    parking_charge: Optional[float]
    club_membership: Optional[float]
    other_charges: Optional[float]
    gst_percentage: float
    stamp_duty_percentage: float
    registration_percentage: float
    total_base_price: float
    total_tax: float
    grand_total: float
    version: int
    created_at: datetime

    class Config:
        from_attributes = True


# Quotation Schemas
class QuotationCreate(BaseModel):
    lead_id: int
    contact_id: Optional[int] = None
    cost_sheet_id: Optional[int] = None
    customer_name: str
    customer_email: Optional[EmailStr] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    project_name: str
    tower: Optional[str] = None
    unit_number: Optional[str] = None
    unit_type: str
    area_sqft: Optional[float] = None
    base_price: float
    floor_premium: Optional[float] = None
    plc: Optional[float] = None
    parking: Optional[float] = None
    club_membership: Optional[float] = None
    other_charges: Optional[float] = None
    gst_amount: float
    stamp_duty: Optional[float] = None
    registration: Optional[float] = None
    total: float
    valid_until: Optional[datetime] = None
    terms_conditions: Optional[str] = None
    notes: Optional[str] = None


class QuotationUpdate(BaseModel):
    status: Optional[str] = None
    valid_until: Optional[datetime] = None
    terms_conditions: Optional[str] = None
    notes: Optional[str] = None


class QuotationResponse(BaseModel):
    id: int
    lead_id: int
    quotation_number: str
    version: int
    customer_name: str
    customer_email: Optional[str]
    customer_phone: Optional[str]
    project_name: str
    tower: Optional[str]
    unit_number: Optional[str]
    unit_type: str
    area_sqft: Optional[float]
    base_price: float
    floor_premium: Optional[float]
    plc: Optional[float]
    parking: Optional[float]
    club_membership: Optional[float]
    other_charges: Optional[float]
    gst_amount: float
    stamp_duty: Optional[float]
    registration: Optional[float]
    total: float
    valid_until: Optional[datetime]
    status: str
    terms_conditions: Optional[str]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# Booking Schemas
class BookingCreate(BaseModel):
    lead_id: int
    contact_id: Optional[int] = None
    quotation_id: Optional[int] = None
    booking_amount: float
    project_name: str
    tower: Optional[str] = None
    unit_number: Optional[str] = None
    unit_type: str
    area_sqft: Optional[float] = None
    customer_name: str
    customer_email: Optional[EmailStr] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    agreement_value: float
    pan_card: bool = False
    aadhar_card: bool = False
    photo: bool = False
    address_proof: bool = False
    bank_details: bool = False
    notes: Optional[str] = None


class BookingUpdate(BaseModel):
    status: Optional[str] = None
    pan_card: Optional[bool] = None
    aadhar_card: Optional[bool] = None
    photo: Optional[bool] = None
    address_proof: Optional[bool] = None
    bank_details: Optional[bool] = None
    agreement_date: Optional[datetime] = None
    agreement_number: Optional[str] = None
    registration_date: Optional[datetime] = None
    registration_number: Optional[str] = None
    notes: Optional[str] = None


class BookingResponse(BaseModel):
    id: int
    lead_id: int
    booking_number: str
    booking_date: datetime
    booking_amount: float
    project_name: str
    tower: Optional[str]
    unit_number: Optional[str]
    unit_type: str
    area_sqft: Optional[float]
    customer_name: str
    customer_email: Optional[str]
    customer_phone: Optional[str]
    agreement_value: float
    status: str
    pan_card: bool
    aadhar_card: bool
    photo: bool
    address_proof: bool
    bank_details: bool
    agreement_date: Optional[datetime]
    agreement_number: Optional[str]
    registration_date: Optional[datetime]
    registration_number: Optional[str]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# Invoice Schemas
class InvoiceCreate(BaseModel):
    booking_id: int
    invoice_date: datetime
    due_date: Optional[datetime] = None
    milestone_name: Optional[str] = None
    milestone_percentage: Optional[float] = None
    notes: Optional[str] = None


class InvoiceUpdate(BaseModel):
    status: Optional[str] = None
    due_date: Optional[datetime] = None
    notes: Optional[str] = None


class InvoiceResponse(BaseModel):
    id: int
    booking_id: int
    invoice_number: str
    invoice_date: datetime
    due_date: Optional[datetime]
    customer_name: str
    customer_email: Optional[str]
    customer_address: Optional[str]
    project_name: str
    unit_number: Optional[str]
    total_amount: float
    paid_amount: float
    balance_amount: float
    status: str
    milestone_name: Optional[str]
    milestone_percentage: Optional[float]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# Payment Schemas
class PaymentCreate(BaseModel):
    booking_id: int
    invoice_id: Optional[int] = None
    payment_date: datetime
    amount: float
    payment_method: str
    reference_number: Optional[str] = None
    bank_name: Optional[str] = None
    cheque_number: Optional[str] = None
    notes: Optional[str] = None


class PaymentResponse(BaseModel):
    id: int
    booking_id: int
    invoice_id: Optional[int]
    payment_number: str
    payment_date: datetime
    amount: float
    payment_method: str
    reference_number: Optional[str]
    bank_name: Optional[str]
    cheque_number: Optional[str]
    receipt_number: Optional[str]
    receipt_date: Optional[datetime]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# Payment Schedule Schemas
class PaymentScheduleCreate(BaseModel):
    booking_id: int
    milestone_name: str
    milestone_percentage: float
    amount: float
    due_date: Optional[datetime] = None


class PaymentScheduleResponse(BaseModel):
    id: int
    booking_id: int
    milestone_name: str
    milestone_percentage: float
    amount: float
    due_date: Optional[datetime]
    is_invoiced: bool
    is_paid: bool
    invoice_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


# Pagination
class PaginatedResponse(BaseModel):
    data: list
    meta: dict
