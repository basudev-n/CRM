from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.auth import get_current_user
from app import models
from app.models import User

router = APIRouter(prefix="/audit-logs", tags=["audit_logs"])


def get_user_org(db: Session, user: User):
    membership = db.query(models.OrgMembership).filter(
        models.OrgMembership.user_id == user.id,
        models.OrgMembership.is_active == True
    ).first()
    return membership.organisation if membership else None


@router.get("/", status_code=status.HTTP_200_OK)
def list_audit_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=200),
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    query = db.query(models.AuditLog).filter(
        models.AuditLog.organisation_id == organisation.id
    )

    if user_id:
        query = query.filter(models.AuditLog.user_id == user_id)
    if action:
        query = query.filter(models.AuditLog.action.ilike(f"%{action}%"))
    if entity_type:
        query = query.filter(models.AuditLog.entity_type.ilike(f"%{entity_type}%"))

    total = query.count()
    logs = query.order_by(models.AuditLog.created_at.desc())\
        .offset((page - 1) * per_page)\
        .limit(per_page)\
        .all()

    user_ids = [log.user_id for log in logs if log.user_id]
    users = db.query(models.User).filter(models.User.id.in_(user_ids)).all() if user_ids else []
    users_map = {u.id: u for u in users}

    result = []
    for log in logs:
        actor = users_map.get(log.user_id)
        result.append({
            "id": log.id,
            "organisation_id": log.organisation_id,
            "user_id": log.user_id,
            "user_name": f"{actor.first_name} {actor.last_name or ''}".strip() if actor else "System",
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "endpoint": log.endpoint,
            "method": log.method,
            "status_code": log.status_code,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "details": log.details,
            "created_at": log.created_at,
        })

    return {
        "data": result,
        "meta": {
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": (total + per_page - 1) // per_page
        }
    }
