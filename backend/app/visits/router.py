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


# ==================== VISIT SLOTS (must be before /{visit_id}) ====================
@router.get("/available-slots", status_code=status.HTTP_200_OK)
def get_visit_slots(
    project_id: Optional[int] = None,
    date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get available visit slots for a project."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    # Default slots: 9 AM to 6 PM, 1 hour each
    default_slots = [
        "09:00", "10:00", "11:00", "12:00",
        "13:00", "14:00", "15:00", "16:00", "17:00"
    ]

    # Get booked slots for the date
    booked_slots = []
    if date:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d")
            start_of_day = target_date.replace(hour=0, minute=0, second=0)
            end_of_day = target_date.replace(hour=23, minute=59, second=59)

            visits = db.query(models.SiteVisit).filter(
                models.SiteVisit.organisation_id == organisation.id,
                models.SiteVisit.scheduled_date >= start_of_day,
                models.SiteVisit.scheduled_date <= end_of_day
            ).all()

            for visit in visits:
                booked_slots.append(visit.scheduled_date.strftime("%H:%M"))
        except:
            pass

    available_slots = [s for s in default_slots if s not in booked_slots]

    return {
        "date": date,
        "project_id": project_id,
        "available_slots": available_slots,
        "booked_slots": booked_slots
    }


@router.get("/check-conflicts", status_code=status.HTTP_200_OK)
def check_visit_conflicts(
    agent_id: int,
    scheduled_date: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check for conflicting visits for an agent on a given date/time."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    try:
        scheduled_dt = datetime.strptime(scheduled_date, "%Y-%m-%d %H:%M")
        start_window = scheduled_dt - timedelta(hours=1)
        end_window = scheduled_dt + timedelta(hours=1)

        conflicts = db.query(models.SiteVisit).filter(
            models.SiteVisit.organisation_id == organisation.id,
            models.SiteVisit.assigned_agent_id == agent_id,
            models.SiteVisit.scheduled_date >= start_window,
            models.SiteVisit.scheduled_date <= end_window
        ).all()

        return {
            "has_conflicts": len(conflicts) > 0,
            "conflicts": [
                {
                    "id": v.id,
                    "lead_id": v.lead_id,
                    "scheduled_date": v.scheduled_date.isoformat()
                } for v in conflicts
            ]
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD HH:MM")


# ==================== MAIN VISIT ENDPOINTS ====================
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

    # Verify lead exists
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
    lead.status = "site_visit"

    # Notify assigned agent when a visit is scheduled by someone else
    if request.assigned_agent_id != current_user.id:
        notification = models.Notification(
            user_id=request.assigned_agent_id,
            organisation_id=organisation.id,
            title=f"New site visit scheduled for {lead.name}",
            message=f"{current_user.first_name} scheduled a site visit on {request.scheduled_date.strftime('%Y-%m-%d %H:%M')}",
            link="/visits"
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
    agent_id: Optional[int] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List visits with filters."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    query = db.query(models.SiteVisit).filter(
        models.SiteVisit.organisation_id == organisation.id
    )

    if status_filter:
        if status_filter == "scheduled":
            query = query.filter(models.SiteVisit.outcome == None)
        elif status_filter == "completed":
            query = query.filter(models.SiteVisit.outcome != None)

    if agent_id:
        query = query.filter(models.SiteVisit.assigned_agent_id == agent_id)

    if from_date:
        try:
            from_dt = datetime.strptime(from_date, "%Y-%m-%d")
            query = query.filter(models.SiteVisit.scheduled_date >= from_dt)
        except:
            pass

    if to_date:
        try:
            to_dt = datetime.strptime(to_date, "%Y-%m-%d")
            query = query.filter(models.SiteVisit.scheduled_date <= to_dt)
        except:
            pass

    total = query.count()
    visits = query.order_by(models.SiteVisit.scheduled_date.desc())\
        .offset((page - 1) * per_page)\
        .limit(per_page)\
        .all()

    return {
        "data": visits,
        "meta": {
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": (total + per_page - 1) // per_page
        }
    }


@router.get("/calendar", status_code=status.HTTP_200_OK)
def get_calendar(
    agent_id: Optional[int] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get calendar view of visits."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    query = db.query(models.SiteVisit).filter(
        models.SiteVisit.organisation_id == organisation.id
    )

    if agent_id:
        query = query.filter(models.SiteVisit.assigned_agent_id == agent_id)

    if from_date:
        try:
            from_dt = datetime.strptime(from_date, "%Y-%m-%d")
            query = query.filter(models.SiteVisit.scheduled_date >= from_dt)
        except:
            pass

    if to_date:
        try:
            to_dt = datetime.strptime(to_date, "%Y-%m-%d")
            query = query.filter(models.SiteVisit.scheduled_date <= to_dt)
        except:
            pass

    visits = query.order_by(models.SiteVisit.scheduled_date).all()

    # Convert to calendar events
    events = []
    for visit in visits:
        events.append({
            "id": visit.id,
            "title": f"Site Visit - Lead #{visit.lead_id}",
            "date": visit.scheduled_date.strftime("%Y-%m-%d"),
            "time": visit.scheduled_date.strftime("%H:%M"),
            "location": visit.location,
            "outcome": visit.outcome,
            "status": "completed" if visit.outcome else "scheduled"
        })

    return {"events": events}


# ==================== VISIT BY ID (must be last) ====================
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
