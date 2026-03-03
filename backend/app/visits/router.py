from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.core.auth import get_current_user
from app import schemas, models
from app.models import User
from typing import Optional
from datetime import datetime, timedelta

router = APIRouter(prefix="/visits", tags=["visits"])


def get_user_org(db: Session, user: User):
    """Get user's organisation."""
    membership = db.query(models.OrgMembership).filter(
        models.OrgMembership.user_id == user.id,
        models.OrgMembership.is_active == True
    ).first()
    return membership.organisation if membership else None


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_visit(
    request: schemas.SiteVisitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new site visit."""
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

    # Verify agent belongs to org
    agent_membership = db.query(models.OrgMembership).filter(
        models.OrgMembership.user_id == request.assigned_agent_id,
        models.OrgMembership.organisation_id == organisation.id,
        models.OrgMembership.is_active == True
    ).first()
    if not agent_membership:
        raise HTTPException(status_code=404, detail="Agent not found in organisation")

    # Check for conflicts
    visit_duration = timedelta(hours=2)
    visit_start = request.scheduled_date
    visit_end = visit_start + visit_duration

    conflicts = db.query(models.SiteVisit).filter(
        models.SiteVisit.organisation_id == organisation.id,
        models.SiteVisit.assigned_agent_id == request.assigned_agent_id,
        models.SiteVisit.completed_at == None,
        models.SiteVisit.scheduled_date < visit_end,
        func.date_add(models.SiteVisit.scheduled_date, func.cast("2 HOUR", type_=None)) > visit_start
    ).count()

    if conflicts > 0:
        raise HTTPException(
            status_code=409,
            detail="Agent has a conflicting visit scheduled at this time"
        )

    visit = models.SiteVisit(
        organisation_id=organisation.id,
        lead_id=request.lead_id,
        scheduled_by=current_user.id,
        assigned_agent_id=request.assigned_agent_id,
        scheduled_date=request.scheduled_date,
        project_name=request.project_name,
        location=request.location,
        remarks=request.remarks
    )
    db.add(visit)

    # Update lead status
    if lead.status in ["new", "contacted"]:
        lead.status = "site_visit"

    # Create activity
    activity = models.Activity(
        organisation_id=organisation.id,
        lead_id=request.lead_id,
        user_id=current_user.id,
        activity_type=models.ActivityType.SITE_VISIT,
        title=f"Site visit scheduled for {request.scheduled_date}",
        description=f"Project: {request.project_name or 'Not specified'}"
    )
    db.add(activity)

    # Create notification
    notification = models.Notification(
        user_id=request.assigned_agent_id,
        organisation_id=organisation.id,
        notification_type=models.NotificationType.SITE_VISIT_SCHEDULED,
        title="Site Visit Scheduled",
        message=f"A site visit has been scheduled for lead: {lead.name}",
        link=f"/leads/{lead.id}"
    )
    db.add(notification)

    db.commit()
    db.refresh(visit)
    return visit


@router.get("/", status_code=status.HTTP_200_OK)
def list_visits(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = None,
    assigned_agent_id: Optional[int] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List site visits."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    query = db.query(models.SiteVisit).filter(
        models.SiteVisit.organisation_id == organisation.id
    )

    if assigned_agent_id:
        query = query.filter(models.SiteVisit.assigned_agent_id == assigned_agent_id)
    if date_from:
        query = query.filter(models.SiteVisit.scheduled_date >= date_from)
    if date_to:
        query = query.filter(models.SiteVisit.scheduled_date <= date_to)

    if status_filter == "scheduled":
        query = query.filter(models.SiteVisit.completed_at == None)
    elif status_filter == "completed":
        query = query.filter(models.SiteVisit.completed_at != None)

    total = query.count()
    visits = query.order_by(models.SiteVisit.scheduled_date.asc())\
        .offset((page - 1) * per_page)\
        .limit(per_page)\
        .all()

    result = []
    for visit in visits:
        lead = db.query(models.Lead).filter(models.Lead.id == visit.lead_id).first()
        agent = db.query(models.User).filter(models.User.id == visit.assigned_agent_id).first()
        result.append({
            "id": visit.id,
            "lead_id": visit.lead_id,
            "scheduled_by": visit.scheduled_by,
            "assigned_agent_id": visit.assigned_agent_id,
            "scheduled_date": visit.scheduled_date,
            "project_name": visit.project_name,
            "location": visit.location,
            "remarks": visit.remarks,
            "outcome": visit.outcome,
            "feedback": visit.feedback,
            "completed_at": visit.completed_at,
            "created_at": visit.created_at,
            "lead": {"id": lead.id, "name": lead.name, "phone": lead.phone} if lead else None,
            "agent": {"id": agent.id, "first_name": agent.first_name, "last_name": agent.last_name} if agent else None
        })

    return {
        "data": result,
        "meta": {"total": total, "page": page, "per_page": per_page, "pages": (total + per_page - 1) // per_page}
    }


@router.get("/calendar", status_code=status.HTTP_200_OK)
def get_calendar(
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    agent_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get visits for calendar view."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    query = db.query(models.SiteVisit).filter(
        models.SiteVisit.organisation_id == organisation.id,
        models.SiteVisit.completed_at == None
    )

    if agent_id:
        query = query.filter(models.SiteVisit.assigned_agent_id == agent_id)
    if date_from:
        query = query.filter(models.SiteVisit.scheduled_date >= date_from)
    if date_to:
        query = query.filter(models.SiteVisit.scheduled_date <= date_to)

    visits = query.order_by(models.SiteVisit.scheduled_date.asc()).all()

    result = []
    for visit in visits:
        lead = db.query(models.Lead).filter(models.Lead.id == visit.lead_id).first()
        agent = db.query(models.User).filter(models.User.id == visit.assigned_agent_id).first()
        result.append({
            "id": visit.id,
            "title": f"{lead.name} - {visit.project_name or 'Site Visit'}" if lead else "Site Visit",
            "start": visit.scheduled_date.isoformat(),
            "end": (visit.scheduled_date + timedelta(hours=2)).isoformat(),
            "lead_id": visit.lead_id,
            "agent_id": visit.assigned_agent_id,
            "agent_name": f"{agent.first_name} {agent.last_name}" if agent else "Unknown",
            "location": visit.location
        })

    return {"events": result}


@router.get("/{visit_id}", status_code=status.HTTP_200_OK)
def get_visit(
    visit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific visit."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    visit = db.query(models.SiteVisit).filter(
        models.SiteVisit.id == visit_id,
        models.SiteVisit.organisation_id == organisation.id
    ).first()

    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    return visit


@router.patch("/{visit_id}", status_code=status.HTTP_200_OK)
def update_visit(
    visit_id: int,
    request: schemas.SiteVisitUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a visit."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    visit = db.query(models.SiteVisit).filter(
        models.SiteVisit.id == visit_id,
        models.SiteVisit.organisation_id == organisation.id
    ).first()

    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    update_data = request.model_dump(exclude_unset=True)

    if request.outcome and not visit.outcome:
        visit.completed_at = datetime.utcnow()

    for key, value in update_data.items():
        setattr(visit, key, value)

    db.commit()
    db.refresh(visit)
    return visit


@router.delete("/{visit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_visit(
    visit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a visit."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    visit = db.query(models.SiteVisit).filter(
        models.SiteVisit.id == visit_id,
        models.SiteVisit.organisation_id == organisation.id
    ).first()

    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    db.delete(visit)
    db.commit()
    return None
