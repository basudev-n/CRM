from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.auth import get_current_user
from app import schemas, models
from app.models import User
from typing import Optional

router = APIRouter(prefix="/contacts", tags=["contacts"])


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


@router.post("/", status_code=status.HTTP_201_CREATED, response_model=schemas.ContactResponse)
def create_contact(
    request: schemas.ContactCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new contact."""
    organisation = get_user_org(db, current_user)

    contact = models.Contact(
        organisation_id=organisation.id,
        first_name=request.first_name,
        last_name=request.last_name,
        email=request.email,
        phone=request.phone,
        alternate_phone=request.alternate_phone,
        address=request.address,
        dob=request.dob,
        contact_type=request.contact_type,
        tags=request.tags,
        notes=request.notes,
        created_by=current_user.id,
        assigned_to=request.assigned_to,
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)

    return contact


@router.get("/", status_code=status.HTTP_200_OK)
def list_contacts(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    contact_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List contacts with pagination and filters."""
    organisation = get_user_org(db, current_user)

    query = db.query(models.Contact).filter(
        models.Contact.organisation_id == organisation.id,
        models.Contact.is_active == True
    )

    # Apply filters
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (models.Contact.first_name.ilike(search_filter)) |
            (models.Contact.last_name.ilike(search_filter)) |
            (models.Contact.email.ilike(search_filter)) |
            (models.Contact.phone.ilike(search_filter))
        )

    if contact_type:
        query = query.filter(models.Contact.contact_type == contact_type)

    # Get total count
    total = query.count()

    # Apply pagination
    contacts = query.order_by(models.Contact.created_at.desc())\
        .offset((page - 1) * per_page)\
        .limit(per_page)\
        .all()

    return {
        "data": contacts,
        "meta": {
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": (total + per_page - 1) // per_page
        }
    }


@router.get("/{contact_id}", status_code=status.HTTP_200_OK, response_model=schemas.ContactResponse)
def get_contact(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific contact."""
    organisation = get_user_org(db, current_user)

    contact = db.query(models.Contact).filter(
        models.Contact.id == contact_id,
        models.Contact.organisation_id == organisation.id,
        models.Contact.is_active == True
    ).first()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found"
        )

    return contact


@router.patch("/{contact_id}", status_code=status.HTTP_200_OK, response_model=schemas.ContactResponse)
def update_contact(
    contact_id: int,
    request: schemas.ContactUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a contact."""
    organisation = get_user_org(db, current_user)

    contact = db.query(models.Contact).filter(
        models.Contact.id == contact_id,
        models.Contact.organisation_id == organisation.id,
        models.Contact.is_active == True
    ).first()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found"
        )

    # Update fields
    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(contact, key, value)

    db.commit()
    db.refresh(contact)

    return contact


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Soft delete a contact."""
    organisation = get_user_org(db, current_user)

    contact = db.query(models.Contact).filter(
        models.Contact.id == contact_id,
        models.Contact.organisation_id == organisation.id,
        models.Contact.is_active == True
    ).first()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found"
        )

    contact.is_active = False
    db.commit()

    return None


@router.post("/merge", status_code=status.HTTP_200_OK)
def merge_contacts(
    request: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Merge duplicate contacts into one."""
    organisation = get_user_org(db, current_user)

    source_id = request.get("source_id")
    target_id = request.get("target_id")

    if not source_id or not target_id:
        raise HTTPException(status_code=400, detail="Source and target contact IDs required")

    if source_id == target_id:
        raise HTTPException(status_code=400, detail="Source and target must be different")

    # Get both contacts
    source = db.query(models.Contact).filter(
        models.Contact.id == source_id,
        models.Contact.organisation_id == organisation.id
    ).first()

    target = db.query(models.Contact).filter(
        models.Contact.id == target_id,
        models.Contact.organisation_id == organisation.id
    ).first()

    if not source or not target:
        raise HTTPException(status_code=404, detail="Contacts not found")

    # Merge: update all leads from source to target
    db.query(models.Lead).filter(
        models.Lead.contact_id == source_id
    ).update({"contact_id": target_id})

    # Merge activities
    db.query(models.Activity).filter(
        models.Activity.contact_id == source_id
    ).update({"contact_id": target_id})

    # Deactivate source
    source.is_active = False

    db.commit()
    db.refresh(target)

    return {
        "merged": True,
        "target_contact": {
            "id": target.id,
            "first_name": target.first_name,
            "last_name": target.last_name,
            "email": target.email,
            "phone": target.phone,
            "contact_type": target.contact_type
        }
    }


@router.post("/import", status_code=status.HTTP_201_CREATED)
def import_contacts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Import contacts from CSV file."""
    # This is a placeholder - in production, you'd handle file upload
    # For now, return a sample response
    return {
        "imported": 0,
        "errors": [],
        "message": "CSV import endpoint ready. Use form-data with 'file' field."
    }
