from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.core.auth import get_current_user
from app import schemas, models
from app.models import User

router = APIRouter(prefix="/activities", tags=["activities"])


def get_user_org(db: Session, user: User):
    """Get user's organisation."""
    membership = db.query(models.OrgMembership).filter(
        models.OrgMembership.user_id == user.id,
        models.OrgMembership.is_active == True
    ).first()
    return membership.organisation if membership else None


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_activity(
    request: schemas.ActivityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new activity."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    # Validate lead belongs to org
    if request.lead_id:
        lead = db.query(models.Lead).filter(
            models.Lead.id == request.lead_id,
            models.Lead.organisation_id == organisation.id
        ).first()
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")

    # Validate contact belongs to org
    if request.contact_id:
        contact = db.query(models.Contact).filter(
            models.Contact.id == request.contact_id,
            models.Contact.organisation_id == organisation.id
        ).first()
        if not contact:
            raise HTTPException(status_code=404, detail="Contact not found")

    activity = models.Activity(
        organisation_id=organisation.id,
        lead_id=request.lead_id,
        contact_id=request.contact_id,
        user_id=current_user.id,
        activity_type=request.activity_type,
        title=request.title,
        description=request.description,
        metadata=request.metadata
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity


@router.get("/lead/{lead_id}", status_code=status.HTTP_200_OK)
def get_lead_timeline(
    lead_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get activity timeline for a lead."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    # Verify lead belongs to org
    lead = db.query(models.Lead).filter(
        models.Lead.id == lead_id,
        models.Lead.organisation_id == organisation.id
    ).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    query = db.query(models.Activity).filter(
        models.Activity.lead_id == lead_id
    ).order_by(models.Activity.created_at.desc())

    total = query.count()
    activities = query.offset((page - 1) * per_page).limit(per_page).all()

    # Get user info for each activity
    result = []
    for activity in activities:
        user = db.query(models.User).filter(models.User.id == activity.user_id).first()
        result.append({
            "id": activity.id,
            "activity_type": activity.activity_type.value,
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

    return {
        "data": result,
        "meta": {
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": (total + per_page - 1) // per_page
        }
    }


@router.get("/contact/{contact_id}", status_code=status.HTTP_200_OK)
def get_contact_timeline(
    contact_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get activity timeline for a contact."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    # Verify contact belongs to org
    contact = db.query(models.Contact).filter(
        models.Contact.id == contact_id,
        models.Contact.organisation_id == organisation.id
    ).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    query = db.query(models.Activity).filter(
        models.Activity.contact_id == contact_id
    ).order_by(models.Activity.created_at.desc())

    total = query.count()
    activities = query.offset((page - 1) * per_page).limit(per_page).all()

    result = []
    for activity in activities:
        user = db.query(models.User).filter(models.User.id == activity.user_id).first()
        result.append({
            "id": activity.id,
            "activity_type": activity.activity_type.value,
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

    return {
        "data": result,
        "meta": {
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": (total + per_page - 1) // per_page
        }
    }


@router.get("/", status_code=status.HTTP_200_OK)
def list_activities(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    lead_id: Optional[int] = None,
    contact_id: Optional[int] = None,
    activity_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List activities for the organisation."""
    from typing import Optional
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    query = db.query(models.Activity).filter(
        models.Activity.organisation_id == organisation.id
    )

    if lead_id:
        query = query.filter(models.Activity.lead_id == lead_id)
    if contact_id:
        query = query.filter(models.Activity.contact_id == contact_id)
    if activity_type:
        query = query.filter(models.Activity.activity_type == activity_type)

    total = query.count()
    activities = query.order_by(models.Activity.created_at.desc())\
        .offset((page - 1) * per_page)\
        .limit(per_page)\
        .all()

    return {
        "data": activities,
        "meta": {
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": (total + per_page - 1) // per_page
        }
    }
