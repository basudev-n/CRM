from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.auth import get_current_user
from sqlalchemy import func, select, and_, or_
from datetime import datetime, timedelta
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

    # Stage distribution
    stage_q = base_lead_query.with_entities(models.Lead.status, func.count(models.Lead.id)).group_by(models.Lead.status)
    stage_counts = [{"status": status, "count": count} for status, count in stage_q]

    # Weekly trend
    seven_days_ago = datetime.utcnow() - timedelta(days=6)
    trend_query = (
        db.query(
            func.date(models.Lead.created_at).label("day"),
            func.count(models.Lead.id).label("count")
        )
        .filter(models.Lead.organisation_id == organisation.id, models.Lead.is_active == True, models.Lead.created_at >= seven_days_ago)
        .group_by(func.date(models.Lead.created_at))
        .order_by(func.date(models.Lead.created_at))
    )
    if role == models.UserRole.AGENT:
        trend_query = trend_query.filter(models.Lead.assigned_to == current_user.id)
    trend = [
        {"day": datetime.strptime(str(row.day), "%Y-%m-%d").strftime("%b %d"), "count": row.count}
        for row in trend_query.all()
    ]

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
        "role": role.value if role else None,
        "stage_counts": stage_counts,
        "lead_trend": trend
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


@router.get("/enhanced-stats")
def get_enhanced_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get enhanced dashboard statistics with tasks, visits, and financial data."""
    organisation = get_user_org(db, current_user)
    role = get_user_role(db, current_user)
    
    if not organisation:
        return {
            "tasks": {"total": 0, "pending": 0, "completed": 0, "overdue": 0},
            "visits": {"total": 0, "upcoming": 0, "completed": 0, "today": 0},
            "finance": {"quotations": 0, "invoices": 0, "pending_amount": 0, "collected_amount": 0},
            "projects": {"total": 0, "active": 0},
            "lead_sources": [],
            "monthly_trend": [],
            "upcoming_visits": [],
            "pending_tasks": [],
            "recent_activities": []
        }
    
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)
    
    # Tasks summary
    tasks_query = db.query(models.Task).filter(
        models.Task.organisation_id == organisation.id
    )
    if role == models.UserRole.AGENT:
        tasks_query = tasks_query.filter(models.Task.assignee_id == current_user.id)
    
    total_tasks = tasks_query.count()
    pending_tasks = tasks_query.filter(models.Task.status == "pending").count()
    completed_tasks = tasks_query.filter(models.Task.status == "completed").count()
    overdue_tasks = tasks_query.filter(
        models.Task.status == "pending",
        models.Task.due_date < now
    ).count()
    
    # Upcoming tasks (next 7 days)
    upcoming_tasks_list = tasks_query.filter(
        models.Task.status == "pending",
        models.Task.due_date >= now,
        models.Task.due_date <= now + timedelta(days=7)
    ).order_by(models.Task.due_date).limit(5).all()
    
    # Site visits summary
    visits_query = db.query(models.SiteVisit).filter(
        models.SiteVisit.organisation_id == organisation.id
    )
    
    total_visits = visits_query.count()
    upcoming_visits = visits_query.filter(
        models.SiteVisit.status == "scheduled",
        models.SiteVisit.scheduled_at >= now
    ).count()
    completed_visits = visits_query.filter(models.SiteVisit.status == "completed").count()
    today_visits = visits_query.filter(
        models.SiteVisit.scheduled_at >= today_start,
        models.SiteVisit.scheduled_at < today_start + timedelta(days=1)
    ).count()
    
    # Upcoming site visits list
    upcoming_visits_list = visits_query.filter(
        models.SiteVisit.status == "scheduled",
        models.SiteVisit.scheduled_at >= now
    ).order_by(models.SiteVisit.scheduled_at).limit(5).all()
    
    # Financial summary
    quotation_count = db.query(models.Quotation).filter(
        models.Quotation.organisation_id == organisation.id
    ).count()
    
    invoice_count = db.query(models.Invoice).filter(
        models.Invoice.organisation_id == organisation.id
    ).count()
    
    # Get pending and collected amounts from payments
    pending_amount = db.query(func.sum(models.Invoice.total_amount)).filter(
        models.Invoice.organisation_id == organisation.id,
        models.Invoice.status.in_(["sent", "overdue"])
    ).scalar() or 0
    
    collected_amount = db.query(func.sum(models.Payment.amount)).filter(
        models.Payment.organisation_id == organisation.id,
        models.Payment.status == "confirmed"
    ).scalar() or 0
    
    # Projects summary
    projects_query = db.query(models.Project).filter(
        models.Project.organisation_id == organisation.id,
        models.Project.is_active == True
    )
    total_projects = projects_query.count()
    active_projects = projects_query.filter(
        models.Project.status.in_(["pre_launch", "launch", "under_construction"])
    ).count()
    
    # Lead sources distribution
    lead_sources = db.query(
        models.Lead.source,
        func.count(models.Lead.id).label("count")
    ).filter(
        models.Lead.organisation_id == organisation.id,
        models.Lead.is_active == True,
        models.Lead.source != None
    ).group_by(models.Lead.source).all()
    
    lead_sources_data = [{"source": s or "Direct", "count": c} for s, c in lead_sources]
    
    # Monthly trend (last 6 months)
    six_months_ago = month_start - timedelta(days=180)
    monthly_trend = db.query(
        func.strftime("%Y-%m", models.Lead.created_at).label("month"),
        func.count(models.Lead.id).label("leads"),
        func.sum(func.case((models.Lead.status == "won", 1), else_=0)).label("won")
    ).filter(
        models.Lead.organisation_id == organisation.id,
        models.Lead.is_active == True,
        models.Lead.created_at >= six_months_ago
    ).group_by(func.strftime("%Y-%m", models.Lead.created_at)).order_by(
        func.strftime("%Y-%m", models.Lead.created_at)
    ).all()
    
    monthly_trend_data = [
        {"month": m, "leads": l, "won": w or 0} 
        for m, l, w in monthly_trend
    ]
    
    # Recent activities
    recent_activities = []
    
    # Recent leads
    recent_leads = db.query(models.Lead).filter(
        models.Lead.organisation_id == organisation.id,
        models.Lead.is_active == True
    ).order_by(models.Lead.created_at.desc()).limit(3).all()
    
    for lead in recent_leads:
        recent_activities.append({
            "type": "lead",
            "action": "created",
            "title": lead.name,
            "subtitle": f"Source: {lead.source or 'Direct'}",
            "timestamp": lead.created_at.isoformat(),
            "icon": "user-plus"
        })
    
    # Recent tasks
    recent_task_activities = db.query(models.Task).filter(
        models.Task.organisation_id == organisation.id
    ).order_by(models.Task.created_at.desc()).limit(2).all()
    
    for task in recent_task_activities:
        recent_activities.append({
            "type": "task",
            "action": "created",
            "title": task.title,
            "subtitle": f"Due: {task.due_date.strftime('%b %d') if task.due_date else 'No due date'}",
            "timestamp": task.created_at.isoformat(),
            "icon": "check-square"
        })
    
    # Sort by timestamp
    recent_activities.sort(key=lambda x: x["timestamp"], reverse=True)
    
    return {
        "tasks": {
            "total": total_tasks,
            "pending": pending_tasks,
            "completed": completed_tasks,
            "overdue": overdue_tasks
        },
        "visits": {
            "total": total_visits,
            "upcoming": upcoming_visits,
            "completed": completed_visits,
            "today": today_visits
        },
        "finance": {
            "quotations": quotation_count,
            "invoices": invoice_count,
            "pending_amount": float(pending_amount),
            "collected_amount": float(collected_amount)
        },
        "projects": {
            "total": total_projects,
            "active": active_projects
        },
        "lead_sources": lead_sources_data,
        "monthly_trend": monthly_trend_data,
        "upcoming_visits": [
            {
                "id": v.id,
                "lead_name": v.lead.name if v.lead else "Unknown",
                "scheduled_at": v.scheduled_at.isoformat() if v.scheduled_at else None,
                "status": v.status
            }
            for v in upcoming_visits_list
        ],
        "pending_tasks": [
            {
                "id": t.id,
                "title": t.title,
                "due_date": t.due_date.isoformat() if t.due_date else None,
                "priority": t.priority,
                "task_type": t.task_type
            }
            for t in upcoming_tasks_list
        ],
        "recent_activities": recent_activities[:5]
    }


@router.get("/onboarding-progress")
def get_onboarding_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get onboarding progress for the current user/organisation."""
    organisation = get_user_org(db, current_user)
    
    if not organisation:
        return {
            "progress": [],
            "completed_count": 0,
            "total_count": 6,
            "percentage": 0
        }
    
    # Check each onboarding task
    progress_items = []
    
    # 1. Create your first lead
    lead_count = db.query(models.Lead).filter(
        models.Lead.organisation_id == organisation.id,
        models.Lead.is_active == True
    ).count()
    progress_items.append({
        "id": "first-lead",
        "title": "Create Your First Lead",
        "description": "Add a lead to start tracking your prospects",
        "completed": lead_count > 0,
        "href": "/leads",
        "icon": "user-plus",
        "count": lead_count
    })
    
    # 2. Add a contact
    contact_count = db.query(models.Contact).filter(
        models.Contact.organisation_id == organisation.id,
        models.Contact.is_active == True
    ).count()
    progress_items.append({
        "id": "first-contact",
        "title": "Add a Contact",
        "description": "Create your first customer contact",
        "completed": contact_count > 0,
        "href": "/contacts",
        "icon": "users",
        "count": contact_count
    })
    
    # 3. Invite team members
    member_count = db.query(models.OrgMembership).filter(
        models.OrgMembership.organisation_id == organisation.id,
        models.OrgMembership.is_active == True
    ).count()
    pending_invites = db.query(models.UserInvite).filter(
        models.UserInvite.organisation_id == organisation.id,
        models.UserInvite.is_active == True,
        models.UserInvite.accepted_at == None
    ).count()
    progress_items.append({
        "id": "invite-team",
        "title": "Invite Team Members",
        "description": "Add your colleagues and assign roles",
        "completed": member_count > 1 or pending_invites > 0,
        "href": "/settings",
        "icon": "user-group",
        "count": member_count - 1 + pending_invites  # Exclude owner
    })
    
    # 4. Create a project
    project_count = db.query(models.Project).filter(
        models.Project.organisation_id == organisation.id,
        models.Project.is_active == True
    ).count()
    progress_items.append({
        "id": "first-project",
        "title": "Create a Project",
        "description": "Set up your first property development",
        "completed": project_count > 0,
        "href": "/projects",
        "icon": "building",
        "count": project_count
    })
    
    # 5. Schedule a site visit
    visit_count = db.query(models.SiteVisit).filter(
        models.SiteVisit.organisation_id == organisation.id
    ).count()
    progress_items.append({
        "id": "schedule-visit",
        "title": "Schedule a Site Visit",
        "description": "Book your first client site visit",
        "completed": visit_count > 0,
        "href": "/visits",
        "icon": "calendar",
        "count": visit_count
    })
    
    # 6. Create a quotation
    quotation_count = db.query(models.Quotation).filter(
        models.Quotation.organisation_id == organisation.id
    ).count()
    progress_items.append({
        "id": "first-quotation",
        "title": "Create a Quotation",
        "description": "Generate your first price quote",
        "completed": quotation_count > 0,
        "href": "/finance/quotations",
        "icon": "file-text",
        "count": quotation_count
    })
    
    completed_count = sum(1 for item in progress_items if item["completed"])
    total_count = len(progress_items)
    percentage = round((completed_count / total_count) * 100) if total_count > 0 else 0
    
    return {
        "progress": progress_items,
        "completed_count": completed_count,
        "total_count": total_count,
        "percentage": percentage
    }
