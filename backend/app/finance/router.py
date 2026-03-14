from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.auth import get_current_user
from app import schemas, models
from app.models import User
from typing import Optional
from datetime import datetime, timedelta
from io import BytesIO
from app.config import settings
import uuid

router = APIRouter(prefix="/finance", tags=["finance"])


def get_user_org(db: Session, user: User):
    """Get user's organisation."""
    membership = db.query(models.OrgMembership).filter(
        models.OrgMembership.user_id == user.id,
        models.OrgMembership.is_active == True
    ).first()
    return membership.organisation if membership else None


def sync_overdue_invoices(db: Session, organisation_id: int, notify: bool = False) -> dict:
    """Mark overdue invoices and optionally create in-app notifications."""
    now = datetime.utcnow()
    overdue_candidates = db.query(models.Invoice).filter(
        models.Invoice.organisation_id == organisation_id,
        models.Invoice.due_date.isnot(None),
        models.Invoice.due_date < now,
        models.Invoice.balance_amount > 0,
        models.Invoice.status.notin_(["paid", "cancelled", "overdue"])
    ).all()

    marked = 0
    notified = 0
    for invoice in overdue_candidates:
        invoice.status = "overdue"
        marked += 1

        if notify and invoice.created_by:
            notification = models.Notification(
                user_id=invoice.created_by,
                organisation_id=organisation_id,
                notification_type="payment_due",
                title=f"Invoice overdue: {invoice.invoice_number}",
                message=f"{invoice.customer_name} has overdue balance of {invoice.balance_amount:.2f}",
                link=f"/finance/invoices"
            )
            db.add(notification)
            notified += 1

    return {"marked_overdue": marked, "notifications_created": notified}


# ============== COST SHEETS ==============

@router.post("/cost-sheets", status_code=status.HTTP_201_CREATED,
             summary="Create cost sheet",
             description="""
Create a detailed cost sheet for a property unit.

**Automatic Calculations**:
- Base cost = Area × Base Rate
- Floor premium calculation
- Tax breakdown (GST, Stamp Duty, Registration)
- Grand total with all charges
             """)
def create_cost_sheet(
    request: schemas.CostSheetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new cost sheet."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    # Calculate totals
    base = (request.area_sqft or 0) * request.base_rate
    floor_premium = (request.area_sqft or 0) * (request.floor_premium_rate or 0)
    base_total = base + floor_premium + (request.plc_amount or 0) + (request.parking_charge or 0) + (request.club_membership or 0) + (request.other_charges or 0)

    # Tax calculations
    gst = base_total * (request.gst_percentage / 100)
    stamp_duty = base_total * (request.stamp_duty_percentage / 100)
    registration = base_total * (request.registration_percentage / 100)
    total_tax = gst + stamp_duty + registration
    grand_total = base_total + total_tax

    cost_sheet = models.CostSheet(
        organisation_id=organisation.id,
        project_name=request.project_name,
        tower=request.tower,
        unit_type=request.unit_type,
        area_sqft=request.area_sqft,
        area_sqmt=request.area_sqmt,
        base_rate=request.base_rate,
        floor_premium_rate=request.floor_premium_rate,
        plc_amount=request.plc_amount,
        parking_charge=request.parking_charge,
        club_membership=request.club_membership,
        other_charges=request.other_charges,
        gst_percentage=request.gst_percentage,
        stamp_duty_percentage=request.stamp_duty_percentage,
        registration_percentage=request.registration_percentage,
        total_base_price=base_total,
        total_tax=total_tax,
        grand_total=grand_total,
        created_by=current_user.id
    )
    db.add(cost_sheet)
    db.commit()
    db.refresh(cost_sheet)
    return cost_sheet


@router.get("/cost-sheets", status_code=status.HTTP_200_OK)
def list_cost_sheets(
    project_name: Optional[str] = None,
    unit_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List cost sheets."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    query = db.query(models.CostSheet).filter(
        models.CostSheet.organisation_id == organisation.id,
        models.CostSheet.is_active == True
    )

    if project_name:
        query = query.filter(models.CostSheet.project_name.ilike(f"%{project_name}%"))
    if unit_type:
        query = query.filter(models.CostSheet.unit_type == unit_type)

    cost_sheets = query.order_by(models.CostSheet.created_at.desc()).all()
    return cost_sheets


# ============== QUOTATIONS ==============

def generate_quotation_number(org_id: int) -> str:
    """Generate unique quotation number."""
    return f"QT-{org_id}-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"


def build_share_url(token: str) -> str:
    base = settings.FRONTEND_BASE_URL.rstrip("/")
    return f"{base}/quotation/share/{token}"


@router.post("/quotations", status_code=status.HTTP_201_CREATED)
def create_quotation(
    request: schemas.QuotationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new quotation."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    # Verify lead belongs to org
    lead = db.query(models.Lead).filter(
        models.Lead.id == request.lead_id,
        models.Lead.organisation_id == organisation.id
    ).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    quotation = models.Quotation(
        organisation_id=organisation.id,
        lead_id=request.lead_id,
        contact_id=request.contact_id,
        cost_sheet_id=request.cost_sheet_id,
        quotation_number=generate_quotation_number(organisation.id),
        customer_name=request.customer_name,
        customer_email=request.customer_email,
        customer_phone=request.customer_phone,
        customer_address=request.customer_address,
        project_name=request.project_name,
        tower=request.tower,
        unit_number=request.unit_number,
        unit_type=request.unit_type,
        area_sqft=request.area_sqft,
        base_price=request.base_price,
        floor_premium=request.floor_premium,
        plc=request.plc,
        parking=request.parking,
        club_membership=request.club_membership,
        other_charges=request.other_charges,
        gst_amount=request.gst_amount,
        stamp_duty=request.stamp_duty,
        registration=request.registration,
        total=request.total,
        valid_until=request.valid_until,
        terms_conditions=request.terms_conditions,
        notes=request.notes,
        created_by=current_user.id
    )
    db.add(quotation)
    db.commit()
    db.refresh(quotation)
    return quotation


@router.post("/quotations/{quotation_id}/share", status_code=status.HTTP_201_CREATED, response_model=schemas.QuotationShareResponse)
def share_quotation(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a shareable quotation link."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    quotation = db.query(models.Quotation).filter(
        models.Quotation.id == quotation_id,
        models.Quotation.organisation_id == organisation.id
    ).first()

    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    share = models.QuotationShare(
        organisation_id=organisation.id,
        quotation_id=quotation.id,
        token=uuid.uuid4().hex,
        expires_at=datetime.utcnow() + timedelta(days=7),
    )

    db.add(share)
    db.commit()
    db.refresh(share)

    return schemas.QuotationShareResponse(
        token=share.token,
        share_url=build_share_url(share.token),
        status=share.status,
        expires_at=share.expires_at,
        created_at=share.created_at,
        organisation_name=organisation.name,
        organisation_logo=organisation.logo,
        organisation_address=organisation.address,
    )


@router.get("/quotations", status_code=status.HTTP_200_OK)
def list_quotations(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = None,
    lead_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List quotations."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    query = db.query(models.Quotation).filter(
        models.Quotation.organisation_id == organisation.id
    )

    if status_filter:
        query = query.filter(models.Quotation.status == status_filter)
    if lead_id:
        query = query.filter(models.Quotation.lead_id == lead_id)

    total = query.count()
    quotations = query.order_by(models.Quotation.created_at.desc())\
        .offset((page - 1) * per_page).limit(per_page).all()

    return {
        "data": quotations,
        "meta": {"total": total, "page": page, "per_page": per_page, "pages": (total + per_page - 1) // per_page}
    }


@router.get("/quotation-share/{token}", status_code=status.HTTP_200_OK, response_model=schemas.SharedQuotationResponse)
def get_shared_quotation(
    token: str,
    db: Session = Depends(get_db)
):
    """Public access to a shared quotation."""
    share = db.query(models.QuotationShare).filter(
        models.QuotationShare.token == token
    ).first()

    if not share or (share.expires_at and share.expires_at < datetime.utcnow()):
        raise HTTPException(status_code=404, detail="Shared quotation not found")

    quotation = db.query(models.Quotation).filter(
        models.Quotation.id == share.quotation_id
    ).first()

    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    organisation = share.organisation or db.query(models.Organisation).filter(models.Organisation.id == share.organisation_id).first()

    share_obj = schemas.QuotationShareResponse(
        token=share.token,
        share_url=build_share_url(share.token),
        status=share.status,
        expires_at=share.expires_at,
        created_at=share.created_at,
        organisation_name=organisation.name if organisation else None,
        organisation_logo=organisation.logo if organisation else None,
        organisation_address=organisation.address if organisation else None,
    )

    return schemas.SharedQuotationResponse(
        share=share_obj,
        quotation=schemas.QuotationResponse.from_orm(quotation),
    )


@router.post("/quotation-share/{token}/action", status_code=status.HTTP_200_OK)
def action_shared_quotation(
    token: str,
    request: schemas.QuotationShareAction,
    db: Session = Depends(get_db)
):
    """Approve or reject a shared quotation."""
    share = db.query(models.QuotationShare).filter(
        models.QuotationShare.token == token
    ).first()

    if not share or (share.expires_at and share.expires_at < datetime.utcnow()):
        raise HTTPException(status_code=404, detail="Shared quotation not found")

    if share.status != "pending":
        raise HTTPException(status_code=400, detail="Share already acted upon")

    quotation = db.query(models.Quotation).filter(
        models.Quotation.id == share.quotation_id
    ).first()

    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    action = request.action.lower()
    if action == "approve":
        share.status = "accepted"
        quotation.status = "accepted"
    elif action == "reject":
        share.status = "rejected"
        quotation.status = "rejected"
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    share.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(share)
    db.refresh(quotation)

    return {"status": share.status, "quotation_status": quotation.status}


@router.get("/quotations/{quotation_id}", status_code=status.HTTP_200_OK)
def get_quotation(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get quotation details."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    quotation = db.query(models.Quotation).filter(
        models.Quotation.id == quotation_id,
        models.Quotation.organisation_id == organisation.id
    ).first()

    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    return quotation


@router.patch("/quotations/{quotation_id}", status_code=status.HTTP_200_OK)
def update_quotation(
    quotation_id: int,
    request: schemas.QuotationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update quotation status."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    quotation = db.query(models.Quotation).filter(
        models.Quotation.id == quotation_id,
        models.Quotation.organisation_id == organisation.id
    ).first()

    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    if request.status:
        quotation.status = request.status
    if request.valid_until:
        quotation.valid_until = request.valid_until
    if request.terms_conditions:
        quotation.terms_conditions = request.terms_conditions
    if request.notes:
        quotation.notes = request.notes

    db.commit()
    db.refresh(quotation)
    return quotation


# ============== BOOKINGS ==============

def generate_booking_number(org_id: int) -> str:
    """Generate unique booking number."""
    return f"BK-{org_id}-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"


@router.post("/bookings", status_code=status.HTTP_201_CREATED)
def create_booking(
    request: schemas.BookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new booking."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    # Verify lead belongs to org
    lead = db.query(models.Lead).filter(
        models.Lead.id == request.lead_id,
        models.Lead.organisation_id == organisation.id
    ).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Update lead status to won
    lead.status = "won"

    booking = models.Booking(
        organisation_id=organisation.id,
        lead_id=request.lead_id,
        contact_id=request.contact_id,
        quotation_id=request.quotation_id,
        booking_number=generate_booking_number(organisation.id),
        booking_date=datetime.utcnow(),
        booking_amount=request.booking_amount,
        project_name=request.project_name,
        tower=request.tower,
        unit_number=request.unit_number,
        unit_type=request.unit_type,
        area_sqft=request.area_sqft,
        customer_name=request.customer_name,
        customer_email=request.customer_email,
        customer_phone=request.customer_phone,
        customer_address=request.customer_address,
        agreement_value=request.agreement_value,
        pan_card=request.pan_card,
        aadhar_card=request.aadhar_card,
        photo=request.photo,
        address_proof=request.address_proof,
        bank_details=request.bank_details,
        notes=request.notes,
        created_by=current_user.id
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


@router.get("/bookings", status_code=status.HTTP_200_OK)
def list_bookings(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List bookings."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    query = db.query(models.Booking).filter(
        models.Booking.organisation_id == organisation.id
    )

    if status_filter:
        query = query.filter(models.Booking.status == status_filter)

    total = query.count()
    bookings = query.order_by(models.Booking.booking_date.desc())\
        .offset((page - 1) * per_page).limit(per_page).all()

    return {
        "data": bookings,
        "meta": {"total": total, "page": page, "per_page": per_page, "pages": (total + per_page - 1) // per_page}
    }


@router.get("/bookings/{booking_id}", status_code=status.HTTP_200_OK)
def get_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get booking details with payments."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    booking = db.query(models.Booking).filter(
        models.Booking.id == booking_id,
        models.Booking.organisation_id == organisation.id
    ).first()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Get payments
    payments = db.query(models.Payment).filter(
        models.Payment.booking_id == booking_id
    ).all()

    # Get payment schedule
    schedules = db.query(models.PaymentSchedule).filter(
        models.PaymentSchedule.booking_id == booking_id
    ).all()

    return {
        "booking": booking,
        "payments": payments,
        "payment_schedule": schedules
    }


@router.patch("/bookings/{booking_id}", status_code=status.HTTP_200_OK)
def update_booking(
    booking_id: int,
    request: schemas.BookingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update booking details."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    booking = db.query(models.Booking).filter(
        models.Booking.id == booking_id,
        models.Booking.organisation_id == organisation.id
    ).first()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(booking, key, value)

    db.commit()
    db.refresh(booking)
    return booking


# ============== INVOICES ==============

def generate_invoice_number(org_id: int) -> str:
    """Generate unique invoice number."""
    return f"INV-{org_id}-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"


@router.post("/invoices", status_code=status.HTTP_201_CREATED,
             summary="Create invoice",
             description="""
Create an invoice for a booking.

**Invoice Number**: Auto-generated in format `INV-{org_id}-{date}-{uuid}`

**Status Flow**: draft → sent → partially_paid → paid
             """)
def create_invoice(
    request: schemas.InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new invoice."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    # Verify booking
    booking = db.query(models.Booking).filter(
        models.Booking.id == request.booking_id,
        models.Booking.organisation_id == organisation.id
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Calculate amount from milestone or use full agreement value
    if request.milestone_percentage:
        total_amount = booking.agreement_value * (request.milestone_percentage / 100)
    else:
        total_amount = booking.agreement_value

    invoice = models.Invoice(
        organisation_id=organisation.id,
        booking_id=request.booking_id,
        invoice_number=generate_invoice_number(organisation.id),
        invoice_date=request.invoice_date,
        due_date=request.due_date,
        customer_name=booking.customer_name,
        customer_email=booking.customer_email,
        customer_address=booking.customer_address,
        project_name=booking.project_name,
        unit_number=booking.unit_number,
        total_amount=total_amount,
        paid_amount=0,
        balance_amount=total_amount,
        milestone_name=request.milestone_name,
        milestone_percentage=request.milestone_percentage,
        notes=request.notes,
        created_by=current_user.id
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice


@router.post("/quotations/{quotation_id}/invoice", status_code=status.HTTP_201_CREATED, response_model=schemas.InvoiceResponse)
def create_invoice_from_quotation(
    quotation_id: int,
    request: schemas.QuotationInvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    quotation = db.query(models.Quotation).filter(
        models.Quotation.id == quotation_id,
        models.Quotation.organisation_id == organisation.id
    ).first()

    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    lead = db.query(models.Lead).filter(
        models.Lead.id == quotation.lead_id,
        models.Lead.organisation_id == organisation.id
    ).first()

    if lead:
        lead.status = "won"

    booking = models.Booking(
        organisation_id=organisation.id,
        lead_id=quotation.lead_id,
        quotation_id=quotation.id,
        booking_number=generate_booking_number(organisation.id),
        booking_date=datetime.utcnow(),
        booking_amount=quotation.total,
        project_name=quotation.project_name,
        tower=quotation.tower,
        unit_number=quotation.unit_number,
        unit_type=quotation.unit_type,
        area_sqft=quotation.area_sqft,
        customer_name=quotation.customer_name,
        customer_email=quotation.customer_email,
        customer_phone=quotation.customer_phone,
        customer_address=quotation.customer_address,
        agreement_value=quotation.total,
        status="booked",
        created_by=current_user.id
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    if request.milestone_percentage:
        amount = booking.agreement_value * (request.milestone_percentage / 100)
        milestone_name = request.milestone_name or f"{request.milestone_percentage}% milestone"
    else:
        amount = booking.agreement_value
        milestone_name = request.milestone_name

    invoice = models.Invoice(
        organisation_id=organisation.id,
        booking_id=booking.id,
        invoice_number=generate_invoice_number(organisation.id),
        invoice_date=request.invoice_date,
        due_date=request.due_date,
        customer_name=booking.customer_name,
        customer_email=booking.customer_email,
        customer_address=booking.customer_address,
        project_name=booking.project_name,
        unit_number=booking.unit_number,
        total_amount=amount,
        paid_amount=0,
        balance_amount=amount,
        milestone_name=milestone_name,
        milestone_percentage=request.milestone_percentage,
        notes=request.notes,
        created_by=current_user.id
    )

    quotation.status = "accepted"
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    db.refresh(quotation)

    return invoice


@router.get("/invoices", status_code=status.HTTP_200_OK)
def list_invoices(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List invoices."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    # Keep invoice statuses aligned with due dates before listing.
    sync_overdue_invoices(db, organisation.id, notify=False)
    db.commit()

    query = db.query(models.Invoice).filter(
        models.Invoice.organisation_id == organisation.id
    )

    if status_filter:
        query = query.filter(models.Invoice.status == status_filter)

    total = query.count()
    invoices = query.order_by(models.Invoice.invoice_date.desc())\
        .offset((page - 1) * per_page).limit(per_page).all()

    return {
        "data": invoices,
        "meta": {"total": total, "page": page, "per_page": per_page, "pages": (total + per_page - 1) // per_page}
    }


# ============== PAYMENTS ==============

def generate_payment_number(org_id: int) -> str:
    """Generate unique payment number."""
    return f"PAY-{org_id}-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"


def generate_receipt_number(org_id: int) -> str:
    """Generate unique receipt number."""
    return f"RCP-{org_id}-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"


@router.post("/payments", status_code=status.HTTP_201_CREATED)
def create_payment(
    request: schemas.PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Record a new payment."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    # Verify booking
    booking = db.query(models.Booking).filter(
        models.Booking.id == request.booking_id,
        models.Booking.organisation_id == organisation.id
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    payment = models.Payment(
        organisation_id=organisation.id,
        booking_id=request.booking_id,
        invoice_id=request.invoice_id,
        payment_number=generate_payment_number(organisation.id),
        payment_date=request.payment_date,
        amount=request.amount,
        payment_method=request.payment_method,
        reference_number=request.reference_number,
        bank_name=request.bank_name,
        cheque_number=request.cheque_number,
        receipt_number=generate_receipt_number(organisation.id),
        receipt_date=datetime.utcnow(),
        notes=request.notes,
        created_by=current_user.id
    )
    db.add(payment)

    # Update invoice if linked
    if request.invoice_id:
        invoice = db.query(models.Invoice).filter(
            models.Invoice.id == request.invoice_id
        ).first()
        if invoice:
            invoice.paid_amount += request.amount
            invoice.balance_amount = invoice.total_amount - invoice.paid_amount
            if invoice.balance_amount <= 0:
                invoice.status = "paid"
            elif invoice.due_date and invoice.due_date < datetime.utcnow():
                invoice.status = "overdue"
            else:
                invoice.status = "issued"

    db.commit()
    db.refresh(payment)
    return payment


@router.get("/payments", status_code=status.HTTP_200_OK)
def list_payments(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    booking_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List payments."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    query = db.query(models.Payment).filter(
        models.Payment.organisation_id == organisation.id
    )

    if booking_id:
        query = query.filter(models.Payment.booking_id == booking_id)

    total = query.count()
    payments = query.order_by(models.Payment.payment_date.desc())\
        .offset((page - 1) * per_page).limit(per_page).all()

    return {
        "data": payments,
        "meta": {"total": total, "page": page, "per_page": per_page, "pages": (total + per_page - 1) // per_page}
    }


# ============== PAYMENT SCHEDULE ==============

@router.post("/payment-schedule", status_code=status.HTTP_201_CREATED)
def create_payment_schedule(
    request: schemas.PaymentScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create payment schedule milestones."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    # Verify booking
    booking = db.query(models.Booking).filter(
        models.Booking.id == request.booking_id,
        models.Booking.organisation_id == organisation.id
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    schedule = models.PaymentSchedule(
        organisation_id=organisation.id,
        booking_id=request.booking_id,
        milestone_name=request.milestone_name,
        milestone_percentage=request.milestone_percentage,
        amount=request.amount,
        due_date=request.due_date
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return schedule


@router.get("/payment-schedule", status_code=status.HTTP_200_OK)
def list_payment_schedule(
    booking_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List payment schedule milestones."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    query = db.query(models.PaymentSchedule).filter(
        models.PaymentSchedule.organisation_id == organisation.id
    )
    if booking_id:
        query = query.filter(models.PaymentSchedule.booking_id == booking_id)

    total = query.count()
    schedules = query.order_by(
        models.PaymentSchedule.due_date.asc().nulls_last(),
        models.PaymentSchedule.created_at.desc()
    ).offset((page - 1) * per_page).limit(per_page).all()

    return {
        "data": schedules,
        "meta": {"total": total, "page": page, "per_page": per_page, "pages": (total + per_page - 1) // per_page}
    }


# ============== FINANCE DASHBOARD ==============

@router.get("/dashboard", status_code=status.HTTP_200_OK)
def get_finance_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get finance dashboard statistics."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    # Ensure overdue data is current for dashboard metrics.
    sync_overdue_invoices(db, organisation.id, notify=False)
    db.commit()

    # Total receivables (sum of all invoice balances)
    from sqlalchemy import func
    total_receivables = db.query(func.sum(models.Invoice.balance_amount)).filter(
        models.Invoice.organisation_id == organisation.id,
        models.Invoice.status != "cancelled"
    ).scalar() or 0

    # Collected amount (sum of all payments)
    collected_amount = db.query(func.sum(models.Payment.amount)).filter(
        models.Payment.organisation_id == organisation.id
    ).scalar() or 0

    # Overdue amount
    overdue_amount = db.query(func.sum(models.Invoice.balance_amount)).filter(
        models.Invoice.organisation_id == organisation.id,
        models.Invoice.due_date < datetime.utcnow(),
        models.Invoice.status == "overdue"
    ).scalar() or 0

    # Collection efficiency
    collection_efficiency = (collected_amount / total_receivables * 100) if total_receivables > 0 else 0

    # Counts
    total_bookings = db.query(models.Booking).filter(
        models.Booking.organisation_id == organisation.id
    ).count()

    total_invoices = db.query(models.Invoice).filter(
        models.Invoice.organisation_id == organisation.id
    ).count()

    total_payments = db.query(models.Payment).filter(
        models.Payment.organisation_id == organisation.id
    ).count()

    # Recent collections
    recent_payments = db.query(models.Payment).filter(
        models.Payment.organisation_id == organisation.id
    ).order_by(models.Payment.payment_date.desc()).limit(5).all()

    recent_collections = []
    for payment in recent_payments:
        booking = db.query(models.Booking).filter(models.Booking.id == payment.booking_id).first()
        recent_collections.append({
            "payment_number": payment.payment_number,
            "customer_name": booking.customer_name if booking else "Unknown",
            "amount": payment.amount,
            "payment_date": payment.payment_date.isoformat() if payment.payment_date else None
        })

    # Top debtors (bookings with highest balance)
    top_debtors_query = db.query(models.Booking, models.Invoice).join(
        models.Invoice, models.Invoice.booking_id == models.Booking.id
    ).filter(
        models.Booking.organisation_id == organisation.id,
        models.Invoice.balance_amount > 0
    ).order_by(models.Invoice.balance_amount.desc()).limit(5).all()

    top_debtors = []
    for booking, invoice in top_debtors_query:
        top_debtors.append({
            "booking_number": booking.booking_number,
            "customer_name": booking.customer_name,
            "project_name": booking.project_name,
            "unit_number": booking.unit_number,
            "agreement_value": booking.agreement_value,
            "balance_amount": invoice.balance_amount
        })

    return {
        "total_receivables": total_receivables,
        "collected_amount": collected_amount,
        "overdue_amount": overdue_amount,
        "collection_efficiency": round(collection_efficiency, 2),
        "total_bookings": total_bookings,
        "total_invoices": total_invoices,
        "total_payments": total_payments,
        "recent_collections": recent_collections,
        "top_debtors": top_debtors
    }


@router.post("/overdue/check", status_code=status.HTTP_200_OK)
def check_overdue_invoices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark overdue invoices and create notifications."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    result = sync_overdue_invoices(db, organisation.id, notify=True)
    db.commit()
    return result


@router.get("/overdue-invoices", status_code=status.HTTP_200_OK)
def list_overdue_invoices(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List overdue invoices."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    sync_overdue_invoices(db, organisation.id, notify=False)
    db.commit()

    query = db.query(models.Invoice).filter(
        models.Invoice.organisation_id == organisation.id,
        models.Invoice.status == "overdue"
    )
    total = query.count()
    invoices = query.order_by(models.Invoice.due_date.asc(), models.Invoice.created_at.desc())\
        .offset((page - 1) * per_page).limit(per_page).all()
    return {
        "data": invoices,
        "meta": {"total": total, "page": page, "per_page": per_page, "pages": (total + per_page - 1) // per_page}
    }


# ============== PDF DOWNLOADS ==============

@router.get("/invoices/{invoice_id}/pdf")
def download_invoice_pdf(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download invoice as PDF with organisation branding."""
    from fastapi.responses import StreamingResponse
    from app.utils.pdf import generate_invoice_pdf, REPORTLAB_AVAILABLE

    if not REPORTLAB_AVAILABLE:
        raise HTTPException(
            status_code=501,
            detail="PDF generation not available. Install reportlab."
        )

    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    # Get invoice
    invoice = db.query(models.Invoice).filter(
        models.Invoice.id == invoice_id,
        models.Invoice.organisation_id == organisation.id
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Get booking
    booking = db.query(models.Booking).filter(models.Booking.id == invoice.booking_id).first()

    # Get payments
    payments = db.query(models.Payment).filter(models.Payment.booking_id == invoice.booking_id).all()

    # Prepare data
    invoice_data = {
        "invoice_number": invoice.invoice_number,
        "invoice_date": invoice.invoice_date.strftime("%Y-%m-%d") if invoice.invoice_date else "",
        "due_date": invoice.due_date.strftime("%Y-%m-%d") if invoice.due_date else "N/A",
        "total_amount": invoice.total_amount,
        "paid_amount": invoice.paid_amount,
        "balance_amount": invoice.balance_amount,
        "notes": invoice.notes,
    }

    org_data = {
        "name": organisation.name,
        "logo": organisation.logo,
        "address": organisation.address,
        "gstin": organisation.gstin,
        "pan": organisation.pan,
    }

    booking_data = {
        "customer_name": booking.customer_name if booking else "",
        "project_name": booking.project_name if booking else "",
        "unit_number": booking.unit_number if booking else "",
        "unit_type": booking.unit_type if booking else "",
        "area_sqft": booking.area_sqft if booking else None,
    }

    payment_list = [
        {
            "payment_date": p.payment_date.strftime("%Y-%m-%d") if p.payment_date else "",
            "amount": p.amount,
            "payment_method": p.payment_method if p.payment_method else "",
            "reference_number": p.reference_number,
        }
        for p in payments
    ]

    try:
        pdf_bytes = generate_invoice_pdf(invoice_data, org_data, booking_data, payment_list)
        return StreamingResponse(
            BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=invoice_{invoice.invoice_number}.pdf"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")


@router.get("/quotations/{quotation_id}/pdf")
def download_quotation_pdf(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download quotation as PDF with organisation branding."""
    from fastapi.responses import StreamingResponse
    from io import BytesIO
    from app.utils.pdf import generate_quotation_pdf, REPORTLAB_AVAILABLE

    if not REPORTLAB_AVAILABLE:
        raise HTTPException(
            status_code=501,
            detail="PDF generation not available. Install reportlab."
        )

    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    # Get quotation
    quotation = db.query(models.Quotation).filter(
        models.Quotation.id == quotation_id,
        models.Quotation.organisation_id == organisation.id
    ).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    org_data = {
        "name": organisation.name,
        "logo": organisation.logo,
        "address": organisation.address,
        "gstin": organisation.gstin,
        "pan": organisation.pan,
    }

    quotation_data = {
        "quotation_number": quotation.quotation_number,
        "created_at": quotation.created_at.strftime("%Y-%m-%d") if quotation.created_at else "",
        "valid_until": quotation.valid_until.strftime("%Y-%m-%d") if quotation.valid_until else "N/A",
        "customer_name": quotation.customer_name,
        "customer_email": quotation.customer_email or "",
        "customer_phone": quotation.customer_phone or "",
        "project_name": quotation.project_name,
        "tower": quotation.tower or "",
        "unit_number": quotation.unit_number or "",
        "unit_type": quotation.unit_type or "",
        "area_sqft": quotation.area_sqft,
        "base_price": quotation.base_price,
        "floor_premium": quotation.floor_premium,
        "plc": quotation.plc,
        "parking": quotation.parking,
        "club_membership": quotation.club_membership,
        "other_charges": quotation.other_charges,
        "gst_amount": quotation.gst_amount,
        "stamp_duty": quotation.stamp_duty,
        "registration": quotation.registration,
        "total": quotation.total,
        "terms_conditions": quotation.terms_conditions,
        "notes": quotation.notes,
        "status": quotation.status,
    }

    try:
        pdf_bytes = generate_quotation_pdf(quotation_data, org_data)
        return StreamingResponse(
            BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=quotation_{quotation.quotation_number}.pdf"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")
