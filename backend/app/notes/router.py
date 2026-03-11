from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.auth import get_current_user
from app import schemas, models
from app.models import User
from typing import Optional
import json
import re

router = APIRouter(prefix="/notes", tags=["notes"])


def get_user_org(db: Session, user: User):
    """Get user's organisation."""
    membership = db.query(models.OrgMembership).filter(
        models.OrgMembership.user_id == user.id,
        models.OrgMembership.is_active == True
    ).first()
    return membership.organisation if membership else None


def extract_mentions(content: str) -> list[int]:
    """Extract @mentions from content and return user IDs."""
    mention_pattern = r'@(\w+\.\w+|\w+)'
    return re.findall(mention_pattern, content)


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_note(
    request: schemas.NoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new note."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    # Extract mentions from content
    mentioned_usernames = extract_mentions(request.content)

    # Find user IDs from mentions
    mentioned_user_ids = []
    for username in mentioned_usernames:
        user = db.query(models.User).filter(
            models.User.email.like(f"%{username}%") |
            (models.User.first_name + "." + models.User.last_name).ilike(f"%{username}%")
        ).first()
        if user and user.id != current_user.id:
            mentioned_user_ids.append(user.id)

    # Validate lead if provided
    if request.lead_id:
        lead = db.query(models.Lead).filter(
            models.Lead.id == request.lead_id,
            models.Lead.organisation_id == organisation.id
        ).first()
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")

    # Validate contact if provided
    if request.contact_id:
        contact = db.query(models.Contact).filter(
            models.Contact.id == request.contact_id,
            models.Contact.organisation_id == organisation.id
        ).first()
        if not contact:
            raise HTTPException(status_code=404, detail="Contact not found")

    note = models.Note(
        organisation_id=organisation.id,
        lead_id=request.lead_id,
        contact_id=request.contact_id,
        created_by_id=current_user.id,
        content=request.content,
        is_pinned=request.is_pinned,
        mentions=json.dumps(mentioned_user_ids) if mentioned_user_ids else None
    )
    db.add(note)

    # Create activity
    if request.lead_id:
        activity = models.Activity(
            organisation_id=organisation.id,
            lead_id=request.lead_id,
            user_id=current_user.id,
            activity_type="note",
            title="Note added",
            description=request.content[:100]
        )
        db.add(activity)

    # Create notifications for mentioned users
    for user_id in mentioned_user_ids:
        notification = models.Notification(
            user_id=user_id,
            organisation_id=organisation.id,
            notification_type="mention",
            title="You were mentioned in a note",
            message=f"{current_user.first_name} mentioned you in a note",
            link=f"/leads/{request.lead_id}" if request.lead_id else None
        )
        db.add(notification)

    db.commit()
    db.refresh(note)
    return note


@router.get("/", status_code=status.HTTP_200_OK)
def list_notes(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    lead_id: Optional[int] = None,
    contact_id: Optional[int] = None,
    pinned_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List notes for a lead or contact."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    if not lead_id and not contact_id:
        raise HTTPException(status_code=400, detail="lead_id or contact_id required")

    query = db.query(models.Note).filter(
        models.Note.organisation_id == organisation.id
    )

    if lead_id:
        query = query.filter(models.Note.lead_id == lead_id)
    if contact_id:
        query = query.filter(models.Note.contact_id == contact_id)
    if pinned_only:
        query = query.filter(models.Note.is_pinned == True)

    total = query.count()
    notes = query.order_by(
        models.Note.is_pinned.desc(),
        models.Note.created_at.desc()
    ).offset((page - 1) * per_page).limit(per_page).all()

    # Get creator info
    result = []
    for note in notes:
        creator = db.query(models.User).filter(models.User.id == note.created_by_id).first()
        result.append({
            "id": note.id,
            "lead_id": note.lead_id,
            "contact_id": note.contact_id,
            "created_by_id": note.created_by_id,
            "content": note.content,
            "is_pinned": note.is_pinned,
            "mentions": note.mentions,
            "created_at": note.created_at,
            "creator": {
                "id": creator.id,
                "first_name": creator.first_name,
                "last_name": creator.last_name,
                "email": creator.email
            } if creator else None
        })

    return {
        "data": result,
        "meta": {"total": total, "page": page, "per_page": per_page, "pages": (total + per_page - 1) // per_page}
    }


@router.get("/{note_id}", status_code=status.HTTP_200_OK)
def get_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific note."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    note = db.query(models.Note).filter(
        models.Note.id == note_id,
        models.Note.organisation_id == organisation.id
    ).first()

    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    return note


@router.patch("/{note_id}", status_code=status.HTTP_200_OK)
def update_note(
    note_id: int,
    request: schemas.NoteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a note."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    note = db.query(models.Note).filter(
        models.Note.id == note_id,
        models.Note.organisation_id == organisation.id
    ).first()

    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    # Only creator can update
    if note.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the creator can update this note")

    update_data = request.model_dump(exclude_unset=True)

    # Re-extract mentions if content changed
    if request.content:
        mentioned_usernames = extract_mentions(request.content)
        mentioned_user_ids = []
        for username in mentioned_usernames:
            user = db.query(models.User).filter(
                models.User.email.like(f"%{username}%") |
                (models.User.first_name + "." + models.User.last_name).ilike(f"%{username}%")
            ).first()
            if user and user.id != current_user.id:
                mentioned_user_ids.append(user.id)
        update_data["mentions"] = json.dumps(mentioned_user_ids) if mentioned_user_ids else None

    for key, value in update_data.items():
        setattr(note, key, value)

    db.commit()
    db.refresh(note)
    return note


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a note."""
    organisation = get_user_org(db, current_user)
    if not organisation:
        raise HTTPException(status_code=403, detail="No organisation found")

    note = db.query(models.Note).filter(
        models.Note.id == note_id,
        models.Note.organisation_id == organisation.id
    ).first()

    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    # Only creator can delete
    if note.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the creator can delete this note")

    db.delete(note)
    db.commit()
    return None
