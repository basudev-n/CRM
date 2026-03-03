from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.auth import get_current_user
from app import schemas, models
from app.models import User
from typing import Optional

router = APIRouter(prefix="/leads", tags=["leads"])


def get_user_org(db: Session, user: User) -> models.Organisation:
    """Get user's organisation."""
    membership = db.query(models.OrgMembership).filter(
        models.OrgMembership.user_id == user.id,
        models.OrgMembership.is_active == True
    ).first()

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of any organisation"
        )

    return membership.organisation


def get_user_role(db: Session, user: User) -> models.UserRole:
    """Get user's role in organisation."""
    membership = db.query(models.OrgMembership).filter(
        models.OrgMembership.user_id == user.id,
        models.OrgMembership.is_active == True
    ).first()

    return membership.role if membership else None


@router.post("/", status_code=status.HTTP_201_CREATED, response_model=schemas.LeadResponse)
def create_lead(
    request: schemas.LeadCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new lead."""
    try:
        organisation = get_user_org(db, current_user)

        # Create contact if contact_id not provided but name/email/phone provided
        contact_id = request.contact_id
        if not contact_id and (request.email or request.phone):
            # Check for existing contact
            existing_contact = None
            if request.email:
                existing_contact = db.query(models.Contact).filter(
                    models.Contact.organisation_id == organisation.id,
                    models.Contact.email == request.email
                ).first()
            if not existing_contact and request.phone:
                existing_contact = db.query(models.Contact).filter(
                    models.Contact.organisation_id == organisation.id,
                    models.Contact.phone == request.phone
                ).first()

            if existing_contact:
                contact_id = existing_contact.id
            else:
                # Create new contact
                contact = models.Contact(
                    organisation_id=organisation.id,
                    first_name=request.name.split()[0] if request.name else "Unknown",
                    last_name=" ".join(request.name.split()[1:]) if len(request.name.split()) > 1 else None,
                    email=request.email,
                    phone=request.phone,
                    created_by=current_user.id,
                )
                db.add(contact)
                db.flush()
                contact_id = contact.id

        lead = models.Lead(
            organisation_id=organisation.id,
            contact_id=contact_id,
            name=request.name,
            email=request.email,
            phone=request.phone,
            source=request.source,
            project_interest=request.project_interest,
            unit_type_preference=request.unit_type_preference,
            budget_min=request.budget_min,
            budget_max=request.budget_max,
            possession_timeline=request.possession_timeline,
            priority=request.priority,
            notes=request.notes,
            assigned_to=request.assigned_to,
            created_by=current_user.id,
            status="New",
        )
        db.add(lead)
        db.commit()
        db.refresh(lead)

        return lead
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error creating lead: {str(e)}")


@router.get("/", status_code=status.HTTP_200_OK)
def list_leads(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    source: Optional[str] = None,
    priority: Optional[str] = None,
    status: Optional[str] = None,
    assigned_to: Optional[int] = None,
    min_budget: Optional[float] = None,
    max_budget: Optional[float] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List leads with pagination and filters."""
    organisation = get_user_org(db, current_user)
    role = get_user_role(db, current_user)

    query = db.query(models.Lead).filter(
        models.Lead.organisation_id == organisation.id,
        models.Lead.is_active == True
    )

    # Apply filters
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (models.Lead.name.ilike(search_filter)) |
            (models.Lead.email.ilike(search_filter)) |
            (models.Lead.phone.ilike(search_filter))
        )

    if source:
        query = query.filter(models.Lead.source == source)

    if priority:
        query = query.filter(models.Lead.priority == priority)

    if status:
        query = query.filter(models.Lead.status == status)

    if assigned_to:
        query = query.filter(models.Lead.assigned_to == assigned_to)

    if min_budget is not None:
        query = query.filter(models.Lead.budget_max >= min_budget)

    if max_budget is not None:
        query = query.filter(models.Lead.budget_min <= max_budget)

    # Role-based filtering (agents see only their leads)
    if role == models.UserRole.AGENT:
        query = query.filter(models.Lead.assigned_to == current_user.id)

    # Get total count
    total = query.count()

    # Apply pagination
    leads = query.order_by(models.Lead.created_at.desc())\
        .offset((page - 1) * per_page)\
        .limit(per_page)\
        .all()

    return {
        "data": leads,
        "meta": {
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": (total + per_page - 1) // per_page
        }
    }


@router.get("/{lead_id}", status_code=status.HTTP_200_OK, response_model=schemas.LeadResponse)
def get_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific lead."""
    organisation = get_user_org(db, current_user)

    lead = db.query(models.Lead).filter(
        models.Lead.id == lead_id,
        models.Lead.organisation_id == organisation.id,
        models.Lead.is_active == True
    ).first()

    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found"
        )

    return lead


@router.patch("/{lead_id}", status_code=status.HTTP_200_OK, response_model=schemas.LeadResponse)
def update_lead(
    lead_id: int,
    request: schemas.LeadUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a lead."""
    organisation = get_user_org(db, current_user)

    lead = db.query(models.Lead).filter(
        models.Lead.id == lead_id,
        models.Lead.organisation_id == organisation.id,
        models.Lead.is_active == True
    ).first()

    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found"
        )

    # Update fields
    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(lead, key, value)

    db.commit()
    db.refresh(lead)

    return lead


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Soft delete a lead."""
    organisation = get_user_org(db, current_user)

    lead = db.query(models.Lead).filter(
        models.Lead.id == lead_id,
        models.Lead.organisation_id == organisation.id,
        models.Lead.is_active == True
    ).first()

    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found"
        )

    lead.is_active = False
    db.commit()

    return None


@router.get("/sources/list")
def get_lead_sources(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of lead sources for the organisation."""
    # Common sources
    common_sources = [
        "99acres",
        "MagicBricks",
        "Housing.com",
        "NoBroker",
        "Sulekha",
        "PropTiger",
        "Facebook",
        "Google",
        "Website",
        "Referral",
        "Walk-in",
        "Exhibition",
        "Other"
    ]
    return {"sources": common_sources}
