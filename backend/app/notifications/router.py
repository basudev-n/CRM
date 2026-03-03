from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.auth import get_current_user
from app import schemas, models
from app.models import User
from typing import Optional

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/", status_code=status.HTTP_200_OK)
def list_notifications(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List notifications for current user."""
    query = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id
    )

    if unread_only:
        query = query.filter(models.Notification.is_read == False)

    total = query.count()
    notifications = query.order_by(
        models.Notification.created_at.desc()
    ).offset((page - 1) * per_page).limit(per_page).all()

    return {
        "data": notifications,
        "meta": {
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": (total + per_page - 1) // per_page
        }
    }


@router.get("/unread-count", status_code=status.HTTP_200_OK)
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get count of unread notifications."""
    count = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == False
    ).count()

    return {"count": count}


@router.patch("/{notification_id}/read", status_code=status.HTTP_200_OK)
def mark_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a notification as read."""
    notification = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == current_user.id
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    db.commit()
    return notification


@router.patch("/read-all", status_code=status.HTTP_200_OK)
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark all notifications as read."""
    db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a notification."""
    notification = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == current_user.id
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    db.delete(notification)
    db.commit()
    return None
