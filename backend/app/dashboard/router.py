from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.auth import get_current_user
from app import models
from app.models import User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def get_user_org(db: Session, user: User):
    """Get user's organisation."""
    membership = db.query(models.OrgMembership).filter(
        models.OrgMembership.user_id == user.id,
        models.OrgMembership.is_active == True
    ).first()

    return membership.organisation if membership else None


def get_user_role(db: Session, user: User):
    """Get user's role in organisation."""
    membership = db.query(models.OrgMembership).filter(
        models.OrgMembership.user_id == user.id,
        models.OrgMembership.is_active == True
    ).first()

    return membership.role if membership else None


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get dashboard statistics."""
    organisation = get_user_org(db, current_user)
    role = get_user_role(db, current_user)

    if not organisation:
        return {
            "leads": {"total": 0, "new_today": 0, "in_pipeline": 0},
            "contacts": {"total": 0},
            "conversion_rate": 0,
            "recent_activity": []
        }

    # Base query
    base_lead_query = db.query(models.Lead).filter(
        models.Lead.organisation_id == organisation.id,
        models.Lead.is_active == True
    )

    # Role-based filtering
    if role == models.UserRole.AGENT:
        base_lead_query = base_lead_query.filter(
            models.Lead.assigned_to == current_user.id
        )

    # Get total leads
    total_leads = base_lead_query.count()

    # Get leads by status
    new_leads = base_lead_query.filter(models.Lead.status == "new").count()
    in_pipeline = base_lead_query.filter(
        models.Lead.status.in_(["new", "contacted", "site_visit", "negotiation"])
    ).count()
    won_leads = base_lead_query.filter(models.Lead.status == "won").count()

    # Calculate conversion rate
    conversion_rate = (won_leads / total_leads * 100) if total_leads > 0 else 0

    # Get total contacts
    contacts_query = db.query(models.Contact).filter(
        models.Contact.organisation_id == organisation.id,
        models.Contact.is_active == True
    )
    if role == models.UserRole.AGENT:
        contacts_query = contacts_query.filter(
            models.Contact.assigned_to == current_user.id
        )
    total_contacts = contacts_query.count()

    return {
        "leads": {
            "total": total_leads,
            "new_today": new_leads,
            "in_pipeline": in_pipeline,
            "won": won_leads
        },
        "contacts": {
            "total": total_contacts
        },
        "conversion_rate": round(conversion_rate, 2),
        "role": role.value if role else None
    }


@router.get("/activity")
def get_recent_activity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 10
):
    """Get recent activity feed."""
    organisation = get_user_org(db, current_user)

    if not organisation:
        return {"activities": []}

    # Get recent leads
    recent_leads = db.query(models.Lead).filter(
        models.Lead.organisation_id == organisation.id,
        models.Lead.is_active == True
    ).order_by(models.Lead.created_at.desc()).limit(limit).all()

    activities = []
    for lead in recent_leads:
        activities.append({
            "type": "lead_created",
            "id": lead.id,
            "title": lead.name,
            "description": f"New lead created - {lead.source or 'Direct'}",
            "timestamp": lead.created_at
        })

    return {"activities": activities}
