from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.auth import get_current_user
from app import schemas, models
from app.models import User
import secrets

router = APIRouter(prefix="/users", tags=["users"])


def check_org_permission(db: Session, user: User, required_roles: list[models.UserRole] = None):
    """Check if user has permission to manage organisation members."""
    membership = db.query(models.OrgMembership).filter(
        models.OrgMembership.user_id == user.id,
        models.OrgMembership.is_active == True
    ).first()

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of any organisation"
        )

    if required_roles and membership.role not in required_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions. Required: {[r.value for r in required_roles]}"
        )

    return membership


@router.post("/invite", status_code=status.HTTP_201_CREATED)
def invite_user(
    request: schemas.InviteUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Invite a new user to the organisation."""
    # Check permission (owner or admin only)
    check_org_permission(
        db, current_user,
        [models.UserRole.OWNER, models.UserRole.ADMIN]
    )

    # Check if user already exists
    existing_user = db.query(models.User).filter(
        models.User.email == request.email
    ).first()

    if existing_user:
        # Check if already a member
        existing_membership = db.query(models.OrgMembership).filter(
            models.OrgMembership.user_id == existing_user.id
        ).first()
        if existing_membership:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already a member of an organisation"
            )

    # Generate invite token
    invite_token = secrets.token_urlsafe(32)

    # TODO: Send invite email with token
    # For now, just return the invite info

    return {
        "message": f"Invitation sent to {request.email}",
        "invite_token": invite_token,
        "email": request.email,
        "role": request.role
    }


@router.get("/me", response_model=schemas.UserResponse)
def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user info."""
    return current_user


@router.get("/me/membership")
def get_current_user_membership(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's organisation membership."""
    membership = db.query(models.OrgMembership).filter(
        models.OrgMembership.user_id == current_user.id,
        models.OrgMembership.is_active == True
    ).first()

    if not membership:
        return {"organisation": None, "role": None}

    return {
        "organisation": {
            "id": membership.organisation.id,
            "name": membership.organisation.name,
        },
        "role": membership.role.value
    }


@router.get("/", status_code=status.HTTP_200_OK)
def list_organisation_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all users in the organisation."""
    # Check permission (must be org member)
    membership = check_org_permission(db, current_user)

    members = db.query(models.OrgMembership).filter(
        models.OrgMembership.organisation_id == membership.organisation_id,
        models.OrgMembership.is_active == True
    ).all()

    result = []
    for m in members:
        result.append({
            "id": m.user.id,
            "email": m.user.email,
            "first_name": m.user.first_name,
            "last_name": m.user.last_name,
            "role": m.role.value,
            "is_active": m.user.is_active,
            "created_at": m.created_at
        })

    return result


@router.patch("/{user_id}/role")
def update_user_role(
    user_id: int,
    new_role: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a user's role in the organisation. Owner/admin only."""
    # Check permission
    current_membership = check_org_permission(
        db, current_user,
        [models.UserRole.OWNER, models.UserRole.ADMIN]
    )

    # Validate role
    try:
        role = models.UserRole(new_role)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {[r.value for r in models.UserRole]}"
        )

    # Find target membership
    target_membership = db.query(models.OrgMembership).filter(
        models.OrgMembership.user_id == user_id,
        models.OrgMembership.organisation_id == current_membership.organisation_id
    ).first()

    if not target_membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in organisation"
        )

    # Prevent demoting owner
    if target_membership.role == models.UserRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify owner's role"
        )

    target_membership.role = role
    db.commit()

    return {"message": f"Role updated to {new_role}"}


@router.delete("/{user_id}")
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deactivate a user's membership in the organisation. Owner/admin only."""
    # Check permission
    current_membership = check_org_permission(
        db, current_user,
        [models.UserRole.OWNER, models.UserRole.ADMIN]
    )

    # Find target membership
    target_membership = db.query(models.OrgMembership).filter(
        models.OrgMembership.user_id == user_id,
        models.OrgMembership.organisation_id == current_membership.organisation_id
    ).first()

    if not target_membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in organisation"
        )

    # Prevent deactivating self or owner
    if target_membership.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate yourself"
        )

    if target_membership.role == models.UserRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot deactivate owner"
        )

    target_membership.is_active = False
    db.commit()

    return {"message": "User deactivated"}
