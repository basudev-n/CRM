from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.auth import get_current_user
from app import schemas, models
from app.models import User
from typing import Optional

router = APIRouter(prefix="/leads", tags=["leads"])


def calculate_lead_score(lead: models.Lead, db: Session) -> int:
    """Calculate lead score based on various factors."""
    score = 0

    # Priority score
    priority_scores = {"high": 30, "medium": 15, "low": 5}
    score += priority_scores.get(lead.priority.lower() if lead.priority else "medium", 15)

    # Budget score - higher if budget is defined and reasonable
    if lead.budget_min and lead.budget_max:
        budget_range = lead.budget_max - lead.budget_min
        if budget_range <= 500000:
            score += 20
        elif budget_range <= 1000000:
            score += 15
        else:
            score += 10

    # Source score - based on typical conversion rates
    source_scores = {
        "referral": 25,
        "website": 20,
        "walk-in": 20,
        "exhibition": 15,
        "99acres": 10,
        "magicbricks": 10,
        "housing.com": 10,
        "nobroker": 5,
        "facebook": 5,
        "google": 10,
    }
    score += source_scores.get(lead.source.lower() if lead.source else "", 5)

    # Project interest - if interested in specific project
    if lead.project_interest:
        score += 10

    # Unit type preference - shows intent
    if lead.unit_type_preference:
        score += 5

    # Possession timeline - urgency
    timeline_scores = {
        "immediate": 20,
        "1-3 months": 15,
        "3-6 months": 10,
        "6-12 months": 5,
        "12+ months": 0,
    }
    score += timeline_scores.get(lead.possession_timeline.lower() if lead.possession_timeline else "", 0)

    # Activity-based scoring
    activity_count = db.query(models.Activity).filter(
        models.Activity.lead_id == lead.id
    ).count()
    if activity_count >= 5:
        score += 20
    elif activity_count >= 3:
        score += 15
    elif activity_count >= 1:
        score += 10

    # Has contact info completeness
    if lead.email:
        score += 5
    if lead.phone:
        score += 5

    return min(score, 100)  # Cap at 100


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


@router.post("/", status_code=status.HTTP_201_CREATED, response_model=schemas.LeadResponse,
             summary="Create a new lead",
             description="""
Create a new lead with contact information, budget, preferences, and source tracking.

**Lead Scoring**: Leads are automatically scored based on:
- Priority level (high/medium/low)
- Budget range
- Lead source (referrals score highest)
- Possession timeline urgency
- Project interest specificity
             """)
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
            score=calculate_lead_score(models.Lead(
                priority=request.priority or "medium",
                budget_min=request.budget_min,
                budget_max=request.budget_max,
                source=request.source or "other",
                project_interest=request.project_interest,
                unit_type_preference=request.unit_type_preference,
                possession_timeline=request.possession_timeline,
                email=request.email,
                phone=request.phone,
                id=0  # Placeholder for activity count query
            ), db),
        )
        db.add(lead)
        db.flush()

        # Log activity for lead creation
        activity = models.Activity(
            organisation_id=organisation.id,
            lead_id=lead.id,
            user_id=current_user.id,
            activity_type="lead_created",
            title="Lead Created",
            description=f"Lead '{request.name}' was created"
        )
        db.add(activity)

        db.commit()
        db.refresh(lead)

        return lead
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error creating lead: {str(e)}")


@router.get("/", status_code=status.HTTP_200_OK,
            summary="List all leads",
            description="""
Retrieve a paginated list of leads with optional filtering.

**Filtering Options**:
- `search`: Search by contact name, email, or phone
- `source`: Filter by lead source (referral, website, walk-in, etc.)
- `priority`: Filter by priority (high, medium, low)
- `status`: Filter by status (new, contacted, qualified, negotiation, won, lost)
- `assigned_to`: Filter by assigned user ID
- `min_budget`/`max_budget`: Filter by budget range

**Role-based Access**:
- Agents see only their assigned leads
- Managers/Admins see all organisation leads
            """)
def list_leads(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page (max 100)"),
    search: Optional[str] = Query(None, description="Search term for contact name/email/phone"),
    source: Optional[str] = Query(None, description="Filter by lead source"),
    priority: Optional[str] = Query(None, description="Filter by priority: high, medium, low"),
    status: Optional[str] = Query(None, description="Filter by status: new, contacted, qualified, negotiation, won, lost"),
    assigned_to: Optional[int] = Query(None, description="Filter by assigned user ID"),
    min_budget: Optional[float] = Query(None, description="Minimum budget filter"),
    max_budget: Optional[float] = Query(None, description="Maximum budget filter"),
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
        "Walk-in",
        "Referral",
        "Exhibition",
        "Other"
    ]
    return {"sources": common_sources}


@router.get("/aging", status_code=status.HTTP_200_OK)
def get_lead_aging(
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get leads with no activity for specified days."""
    from datetime import datetime, timedelta
    organisation = get_user_org(db, current_user)

    cutoff_date = datetime.utcnow() - timedelta(days=days)

    # Get leads with no activities after cutoff date
    aging_leads = db.query(models.Lead).filter(
        models.Lead.organisation_id == organisation.id,
        models.Lead.is_active == True,
        models.Lead.created_at < cutoff_date
    ).all()

    # Filter leads that have no activities
    from sqlalchemy import or_
    aging_by_days = {"1-7": [], "8-14": [], "15-30": [], "30+": []}

    for lead in aging_leads:
        last_activity = db.query(models.Activity).filter(
            or_(
                models.Activity.lead_id == lead.id,
                models.Activity.contact_id == lead.contact_id
            ),
            models.Activity.created_at > cutoff_date
        ).first()

        if not last_activity:
            age_days = (datetime.utcnow() - lead.created_at).days
            if age_days <= 7:
                aging_by_days["1-7"].append(lead)
            elif age_days <= 14:
                aging_by_days["8-14"].append(lead)
            elif age_days <= 30:
                aging_by_days["15-30"].append(lead)
            else:
                aging_by_days["30+"].append(lead)

    return {
        "leads": aging_by_days,
        "total": len(aging_leads)
    }


@router.get("/lost", status_code=status.HTTP_200_OK)
def get_lost_leads(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    days: Optional[int] = Query(None, ge=1, le=365, description="Filter leads lost within last X days"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all lost leads with optional date filter."""
    organisation = get_user_org(db, current_user)
    role = get_user_role(db, current_user)

    query = db.query(models.Lead).filter(
        models.Lead.organisation_id == organisation.id,
        models.Lead.is_active == True
    )

    # Filter for lost status
    query = query.filter(models.Lead.status.ilike("%lost%"))

    # Filter by date if specified
    if days:
        from datetime import datetime, timedelta
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        query = query.filter(models.Lead.updated_at >= cutoff_date)

    # Role-based filtering
    if role == models.UserRole.AGENT:
        query = query.filter(models.Lead.assigned_to == current_user.id)

    total = query.count()
    lost_leads = query.order_by(models.Lead.updated_at.desc())\
        .offset((page - 1) * per_page)\
        .limit(per_page)\
        .all()

    return {
        "data": lost_leads,
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


@router.post("/bulk-assign", status_code=status.HTTP_200_OK)
def bulk_assign_leads(
    request: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Bulk assign leads to an agent."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    lead_ids = request.get("lead_ids", [])
    assigned_to = request.get("assigned_to")

    if not lead_ids:
        raise HTTPException(status_code=400, detail="No leads specified")

    if not assigned_to:
        raise HTTPException(status_code=400, detail="No assignee specified")

    # Update leads
    updated_count = 0
    for lead_id in lead_ids:
        lead = db.query(models.Lead).filter(
            models.Lead.id == lead_id,
            models.Lead.organisation_id == organisation.id
        ).first()
        if lead:
            lead.assigned_to = assigned_to
            updated_count += 1

    db.commit()
    return {"updated": updated_count}


@router.get("/check-duplicates", status_code=status.HTTP_200_OK)
def check_lead_duplicates(
    phone: Optional[str] = None,
    email: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check for duplicate leads based on phone or email."""
    organisation = get_user_org(db, current_user)

    duplicates = []

    if phone:
        existing = db.query(models.Lead).filter(
            models.Lead.organisation_id == organisation.id,
            models.Lead.phone == phone,
            models.Lead.is_active == True
        ).all()
        for lead in existing:
            duplicates.append({
                "type": "phone",
                "value": phone,
                "lead_id": lead.id,
                "lead_name": lead.name,
                "status": lead.status,
                "assigned_to": lead.assigned_to
            })

    if email:
        existing = db.query(models.Lead).filter(
            models.Lead.organisation_id == organisation.id,
            models.Lead.email == email,
            models.Lead.is_active == True
        ).all()
        for lead in existing:
            duplicates.append({
                "type": "email",
                "value": email,
                "lead_id": lead.id,
                "lead_name": lead.name,
                "status": lead.status,
                "assigned_to": lead.assigned_to
            })

    return {
        "has_duplicates": len(duplicates) > 0,
        "duplicates": duplicates
    }


@router.post("/recalculate-score/{lead_id}", status_code=status.HTTP_200_OK)
def recalculate_lead_score(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Recalculate lead score for a specific lead."""
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

    new_score = calculate_lead_score(lead, db)
    lead.score = new_score
    db.commit()
    db.refresh(lead)

    return {"lead_id": lead_id, "score": new_score}


# ============== PHASE 2 ADDITIONS ==============

@router.post("/{lead_id}/reopen", status_code=status.HTTP_200_OK, response_model=schemas.LeadResponse)
def reopen_lead(
    lead_id: int,
    new_status: str = "Contacted",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reopen a lost lead."""
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

    # Check if lead is actually lost
    if not lead.status or "lost" not in lead.status.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lead is not in lost status"
        )

    old_status = lead.status
    lead.status = new_status
    lead.lost_reason = None  # Clear lost reason

    # Log activity
    activity = models.Activity(
        organisation_id=organisation.id,
        lead_id=lead.id,
        user_id=current_user.id,
        activity_type="lead_reopened",
        title=f"Lead reopened from {old_status}",
        description=f"Lead was reopened and moved to {new_status}"
    )
    db.add(activity)

    # Recalculate score
    lead.score = calculate_lead_score(lead, db)

    # Create notification for assignee if different from current user
    if lead.assigned_to and lead.assigned_to != current_user.id:
        notification = models.Notification(
            user_id=lead.assigned_to,
            organisation_id=organisation.id,
            title=f"Lead reopened: {lead.name}",
            message=f"{current_user.first_name} reopened a lead assigned to you",
            link=f"/leads/{lead_id}"
        )
        db.add(notification)

    db.commit()
    db.refresh(lead)

    return lead


@router.post("/{lead_id}/convert", status_code=status.HTTP_200_OK)
def convert_lead_to_contact(
    lead_id: int,
    new_status: Optional[str] = "Booking",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Convert a lead to a contact and update lead status."""
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

    # Check if lead already has a contact
    if lead.contact_id:
        # Just update the contact type
        contact = db.query(models.Contact).filter(
            models.Contact.id == lead.contact_id,
            models.Contact.organisation_id == organisation.id
        ).first()
        if contact:
            contact.contact_type = "customer"
    else:
        # Create a new contact from lead
        name_parts = lead.name.split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else None

        contact = models.Contact(
            organisation_id=organisation.id,
            first_name=first_name,
            last_name=last_name,
            email=lead.email,
            phone=lead.phone,
            contact_type="customer",
            assigned_to=lead.assigned_to,
            created_by=current_user.id
        )
        db.add(contact)
        db.flush()
        lead.contact_id = contact.id

    # Update lead status
    old_status = lead.status
    lead.status = new_status
    lead.lost_reason = None  # Clear any lost reason

    # Log activity
    activity = models.Activity(
        organisation_id=organisation.id,
        lead_id=lead.id,
        contact_id=lead.contact_id,
        user_id=current_user.id,
        activity_type="lead_converted",
        title="Lead converted to customer",
        description=f"Lead '{lead.name}' was converted to a customer. Status changed from {old_status} to {new_status}"
    )
    db.add(activity)

    # Create notification
    if lead.assigned_to and lead.assigned_to != current_user.id:
        notification = models.Notification(
            user_id=lead.assigned_to,
            organisation_id=organisation.id,
            title=f"Lead converted: {lead.name}",
            message=f"{current_user.first_name} converted a lead assigned to you to a customer",
            link=f"/leads/{lead_id}"
        )
        db.add(notification)

    # Recalculate score
    lead.score = calculate_lead_score(lead, db)

    db.commit()
    db.refresh(lead)

    return {
        "lead": lead,
        "contact": contact
    }


@router.get("/{lead_id}/timeline", status_code=status.HTTP_200_OK)
def get_lead_timeline_full(
    lead_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get full timeline for a lead (activities, notes, visits)."""
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

    timeline_items = []

    # Get activities
    activities = db.query(models.Activity).filter(
        models.Activity.lead_id == lead_id
    ).order_by(models.Activity.created_at.desc()).all()

    for activity in activities:
        user = db.query(models.User).filter(models.User.id == activity.user_id).first()
        timeline_items.append({
            "type": "activity",
            "id": activity.id,
            "activity_type": activity.activity_type,
            "title": activity.title,
            "description": activity.description,
            "created_at": activity.created_at,
            "user": {
                "id": user.id,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email
            } if user else None
        })

    # Get notes
    notes = db.query(models.Note).filter(
        models.Note.lead_id == lead_id
    ).order_by(models.Note.created_at.desc()).all()

    for note in notes:
        user = db.query(models.User).filter(models.User.id == note.created_by_id).first()
        timeline_items.append({
            "type": "note",
            "id": note.id,
            "title": "Note",
            "content": note.content,
            "is_pinned": note.is_pinned,
            "mentions": note.mentions,
            "created_at": note.created_at,
            "user": {
                "id": user.id,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email
            } if user else None
        })

    # Get visits
    visits = db.query(models.SiteVisit).filter(
        models.SiteVisit.lead_id == lead_id
    ).order_by(models.SiteVisit.scheduled_date.desc()).all()

    for visit in visits:
        agent = db.query(models.User).filter(models.User.id == visit.assigned_agent_id).first()
        scheduled_by = db.query(models.User).filter(models.User.id == visit.scheduled_by).first()
        timeline_items.append({
            "type": "visit",
            "id": visit.id,
            "title": "Site Visit",
            "scheduled_date": visit.scheduled_date,
            "project_name": visit.project_name,
            "location": visit.location,
            "remarks": visit.remarks,
            "outcome": visit.outcome,
            "feedback": visit.feedback,
            "completed_at": visit.completed_at,
            "created_at": visit.created_at,
            "assigned_agent": {
                "id": agent.id,
                "first_name": agent.first_name,
                "last_name": agent.last_name,
            } if agent else None,
            "scheduled_by": {
                "id": scheduled_by.id,
                "first_name": scheduled_by.first_name,
                "last_name": scheduled_by.last_name,
            } if scheduled_by else None
        })

    # Sort all items by created_at descending
    timeline_items.sort(key=lambda x: x["created_at"], reverse=True)

    # Paginate
    total = len(timeline_items)
    start = (page - 1) * per_page
    end = start + per_page
    paginated_items = timeline_items[start:end]

    return {
        "data": paginated_items,
        "meta": {
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": (total + per_page - 1) // per_page
        }
    }
