from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.auth import get_current_user
from app import schemas, models
from app.models import User
from typing import Optional
import json

router = APIRouter(prefix="/pipeline", tags=["pipeline"])


def get_user_org(db: Session, user: User):
    """Get user's organisation."""
    membership = db.query(models.OrgMembership).filter(
        models.OrgMembership.user_id == user.id,
        models.OrgMembership.is_active == True
    ).first()
    return membership.organisation if membership else None


def check_org_permission(db: Session, user: User, allowed_roles: list[models.UserRole] = None):
    """Check if user has organisation permissions."""
    membership = db.query(models.OrgMembership).filter(
        models.OrgMembership.user_id == user.id,
        models.OrgMembership.is_active == True
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of any organisation")
    if allowed_roles and membership.role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return membership


# Pipeline Stages
@router.get("/stages", status_code=status.HTTP_200_OK)
def list_stages(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all pipeline stages for the organisation."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        return {"stages": [], "leads_by_stage": {}}

    stages = db.query(models.PipelineStage).filter(
        models.PipelineStage.organisation_id == organisation.id
    ).order_by(models.PipelineStage.order).all()

    # Get leads grouped by status
    from sqlalchemy import func
    lead_counts = db.query(
        models.Lead.status,
        func.count(models.Lead.id)
    ).filter(
        models.Lead.organisation_id == organisation.id,
        models.Lead.is_active == True
    ).group_by(models.Lead.status).all()

    leads_by_stage = {status: count for status, count in lead_counts}

    return {"stages": stages, "leads_by_stage": leads_by_stage}


@router.post("/stages", status_code=status.HTTP_201_CREATED)
def create_stage(
    request: schemas.PipelineStageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new pipeline stage."""
    membership = check_org_permission(db, current_user, [models.UserRole.OWNER, models.UserRole.ADMIN])
    organisation = get_user_org(db, current_user)

    stage = models.PipelineStage(
        organisation_id=organisation.id,
        name=request.name,
        color=request.color,
        order=request.order,
        is_won=request.is_won,
        is_lost=request.is_lost,
    )
    db.add(stage)
    db.commit()
    db.refresh(stage)
    return stage


@router.patch("/stages/{stage_id}", status_code=status.HTTP_200_OK)
def update_stage(
    stage_id: int,
    request: schemas.PipelineStageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a pipeline stage."""
    membership = check_org_permission(db, current_user, [models.UserRole.OWNER, models.UserRole.ADMIN])
    organisation = get_user_org(db, current_user)

    stage = db.query(models.PipelineStage).filter(
        models.PipelineStage.id == stage_id,
        models.PipelineStage.organisation_id == organisation.id
    ).first()

    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")

    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(stage, key, value)

    db.commit()
    db.refresh(stage)
    return stage


@router.delete("/stages/{stage_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_stage(
    stage_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a pipeline stage."""
    membership = check_org_permission(db, current_user, [models.UserRole.OWNER, models.UserRole.ADMIN])
    organisation = get_user_org(db, current_user)

    stage = db.query(models.PipelineStage).filter(
        models.PipelineStage.id == stage_id,
        models.PipelineStage.organisation_id == organisation.id
    ).first()

    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")

    # Check if there are leads in this stage
    lead_count = db.query(models.Lead).filter(
        models.Lead.status == stage.name,
        models.Lead.organisation_id == organisation.id
    ).count()

    if lead_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete stage with leads")

    db.delete(stage)
    db.commit()
    return None


# Kanban Board
@router.get("/kanban", status_code=status.HTTP_200_OK)
def get_kanban_board(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get kanban board with leads grouped by stage."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        return {"stages": [], "leads": {}}

    # Get stages
    stages = db.query(models.PipelineStage).filter(
        models.PipelineStage.organisation_id == organisation.id
    ).order_by(models.PipelineStage.order).all()

    # Default stages if none exist
    if not stages:
        default_stages = [
            ("New", "#6366f1", 0, False, False),
            ("Contacted", "#f59e0b", 1, False, False),
            ("Site Visit Scheduled", "#8b5cf6", 2, False, False),
            ("Site Visited", "#ec4899", 3, False, False),
            ("Negotiation", "#14b8a6", 4, False, False),
            ("Booking", "#22c55e", 5, False, False),
            ("Won", "#10b981", 6, True, False),
            ("Lost", "#ef4444", 7, False, True),
        ]
        for name, color, order, is_won, is_lost in default_stages:
            stage = models.PipelineStage(
                organisation_id=organisation.id,
                name=name,
                color=color,
                order=order,
                is_won=is_won,
                is_lost=is_lost
            )
            db.add(stage)
        db.commit()
        stages = db.query(models.PipelineStage).filter(
            models.PipelineStage.organisation_id == organisation.id
        ).order_by(models.PipelineStage.order).all()

    # Get leads
    leads = db.query(models.Lead).filter(
        models.Lead.organisation_id == organisation.id,
        models.Lead.is_active == True
    ).order_by(models.Lead.updated_at.desc()).all()

    # Group leads by status (case-insensitive)
    leads_by_stage = {}
    for stage in stages:
        stage_name = stage.name
        leads_by_stage[stage_name] = [
            {
                "id": lead.id,
                "name": lead.name,
                "email": lead.email,
                "phone": lead.phone,
                "priority": lead.priority,
                "score": lead.score,
                "source": lead.source,
                "assigned_to": lead.assigned_to,
                "updated_at": lead.updated_at.isoformat() if lead.updated_at else None
            }
            for lead in leads if lead.status and lead.status.lower() == stage_name.lower()
        ]

    return {"stages": stages, "leads": leads_by_stage}


@router.patch("/leads/{lead_id}/stage", status_code=status.HTTP_200_OK)
def move_lead_stage(
    lead_id: int,
    new_status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Move a lead to a different stage."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    lead = db.query(models.Lead).filter(
        models.Lead.id == lead_id,
        models.Lead.organisation_id == organisation.id
    ).first()

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    old_status = lead.status
    lead.status = new_status

    # Create activity log
    activity = models.Activity(
        organisation_id=organisation.id,
        lead_id=lead.id,
        user_id=current_user.id,
        activity_type="status_change",
        title=f"Lead moved from {old_status} to {new_status}",
        description=f"Status changed from {old_status} to {new_status}"
    )
    db.add(activity)

    # Recalculate score
    lead.score = calculate_lead_score(lead)

    db.commit()
    db.refresh(lead)
    return lead


def calculate_lead_score(lead: models.Lead) -> int:
    """Calculate lead score based on various factors."""
    score = 0

    # Priority scoring
    priority_scores = {"high": 30, "medium": 20, "low": 10}
    score += priority_scores.get(lead.priority, 20)

    # Budget scoring
    if lead.budget_min and lead.budget_max:
        avg_budget = (lead.budget_min + lead.budget_max) / 2
        if avg_budget >= 5000000:  # 50L+
            score += 30
        elif avg_budget >= 3000000:  # 30L+
            score += 20
        else:
            score += 10

    # Status scoring
    status_scores = {
        "new": 5,
        "contacted": 15,
        "site_visit": 25,
        "negotiation": 35,
        "booking": 50,
        "won": 60,
        "lost": 0
    }
    score += status_scores.get(lead.status, 5)

    return min(score, 100)  # Cap at 100
