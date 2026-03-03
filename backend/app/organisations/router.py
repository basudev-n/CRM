from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.auth import get_current_user, get_current_org, require_org, require_role
from app import schemas, models
from app.models import User

router = APIRouter(prefix="/organisations", tags=["organisations"])


@router.post("/", response_model=schemas.OrganisationResponse, status_code=status.HTTP_201_CREATED)
def create_organisation(
    request: schemas.OrganisationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new organisation. Only available to users without an organisation."""
    # Check if user already has an organisation as owner
    existing_membership = db.query(models.OrgMembership).filter(
        models.OrgMembership.user_id == current_user.id,
        models.OrgMembership.role == models.UserRole.OWNER
    ).first()

    if existing_membership:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an organisation"
        )

    # Create organisation
    organisation = models.Organisation(
        name=request.name,
        type=request.type,
        rera_number=request.rera_number,
        timezone=request.timezone,
        currency=request.currency,
    )
    db.add(organisation)
    db.flush()

    # Create owner membership
    membership = models.OrgMembership(
        user_id=current_user.id,
        organisation_id=organisation.id,
        role=models.UserRole.OWNER,
    )
    db.add(membership)
    db.commit()
    db.refresh(organisation)

    return organisation


@router.get("/me", response_model=schemas.OrganisationResponse)
def get_my_organisation(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's organisation."""
    membership = db.query(models.OrgMembership).filter(
        models.OrgMembership.user_id == current_user.id,
        models.OrgMembership.is_active == True
    ).first()

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No organisation found"
        )

    return membership.organisation


@router.get("/me/members", response_model=list)
def get_organisation_members(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all members of current user's organisation."""
    membership = db.query(models.OrgMembership).filter(
        models.OrgMembership.user_id == current_user.id,
        models.OrgMembership.is_active == True
    ).first()

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No organisation found"
        )

    members = db.query(models.OrgMembership).filter(
        models.OrgMembership.organisation_id == membership.organisation_id,
        models.OrgMembership.is_active == True
    ).all()

    return members
