from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.auth import get_current_user
from app.auth.service import hash_password, create_tokens
from app import schemas, models
from app.models import User
from app.utils.email import send_invite_email
import secrets
from datetime import datetime, timedelta

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


@router.post("/invite", status_code=status.HTTP_201_CREATED, response_model=schemas.InviteResponse)
def invite_user(
    request: schemas.InviteUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Invite a new user to the organisation."""
    # Check permission (owner or admin only)
    membership = check_org_permission(
        db, current_user,
        [models.UserRole.OWNER, models.UserRole.ADMIN]
    )

    # Check if user already exists
    existing_user = db.query(models.User).filter(
        models.User.email == request.email
    ).first()

    if existing_user:
        # Check if already a member of this org
        existing_membership = db.query(models.OrgMembership).filter(
            models.OrgMembership.user_id == existing_user.id,
            models.OrgMembership.organisation_id == membership.organisation_id
        ).first()
        if existing_membership:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already a member of this organisation"
            )

    # Check if invite already exists
    existing_invite = db.query(models.UserInvite).filter(
        models.UserInvite.email == request.email,
        models.UserInvite.organisation_id == membership.organisation_id,
        models.UserInvite.is_active == True,
        models.UserInvite.accepted_at == None
    ).first()
    
    if existing_invite:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An active invitation already exists for this email"
        )

    # Validate role
    try:
        role = models.UserRole(request.role)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {[r.value for r in models.UserRole]}"
        )

    # Generate invite token
    invite_token = secrets.token_urlsafe(32)

    # Create invite record
    invite = models.UserInvite(
        email=request.email,
        organisation_id=membership.organisation_id,
        role=role,
        first_name=request.first_name,
        last_name=request.last_name,
        invite_token=invite_token,
        invited_by=current_user.id,
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)

    # Send invite email
    inviter_name = f"{current_user.first_name} {current_user.last_name or ''}".strip()
    org = db.query(models.Organisation).filter(
        models.Organisation.id == membership.organisation_id
    ).first()
    org_name = org.name if org else "your organisation"
    send_invite_email(
        to_email=request.email,
        first_name=request.first_name,
        organisation_name=org_name,
        role=role.value,
        invite_token=invite_token,
        inviter_name=inviter_name,
    )

    return {
        "message": f"Invitation sent to {request.email}",
        "invite_id": invite.id,
        "invite_token": invite_token
    }


@router.get("/invites/pending", response_model=list[schemas.PendingInviteResponse])
def list_pending_invites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all pending invitations for the organisation."""
    membership = check_org_permission(db, current_user)
    
    invites = db.query(models.UserInvite).filter(
        models.UserInvite.organisation_id == membership.organisation_id,
        models.UserInvite.is_active == True,
        models.UserInvite.accepted_at == None,
        models.UserInvite.expires_at > datetime.utcnow()
    ).all()
    
    return [
        {
            "id": inv.id,
            "email": inv.email,
            "first_name": inv.first_name,
            "last_name": inv.last_name,
            "role": inv.role.value,
            "expires_at": inv.expires_at,
            "created_at": inv.created_at
        }
        for inv in invites
    ]


@router.delete("/invites/{invite_id}")
def cancel_invite(
    invite_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancel a pending invitation."""
    membership = check_org_permission(
        db, current_user,
        [models.UserRole.OWNER, models.UserRole.ADMIN]
    )
    
    invite = db.query(models.UserInvite).filter(
        models.UserInvite.id == invite_id,
        models.UserInvite.organisation_id == membership.organisation_id
    ).first()
    
    if not invite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    
    invite.is_active = False
    db.commit()
    
    return {"message": "Invitation cancelled"}


@router.get("/invites/validate/{token}")
def validate_invite(
    token: str,
    db: Session = Depends(get_db)
):
    """Validate an invitation token (public endpoint)."""
    invite = db.query(models.UserInvite).filter(
        models.UserInvite.invite_token == token,
        models.UserInvite.is_active == True,
        models.UserInvite.accepted_at == None,
        models.UserInvite.expires_at > datetime.utcnow()
    ).first()
    
    if not invite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired invitation"
        )
    
    return {
        "email": invite.email,
        "first_name": invite.first_name,
        "last_name": invite.last_name,
        "role": invite.role.value,
        "organisation_name": invite.organisation.name
    }


@router.post("/invites/accept", response_model=schemas.TokenResponse)
def accept_invite(
    request: schemas.AcceptInviteRequest,
    db: Session = Depends(get_db)
):
    """Accept an invitation and create user account."""
    # Find the invite
    invite = db.query(models.UserInvite).filter(
        models.UserInvite.invite_token == request.invite_token,
        models.UserInvite.is_active == True,
        models.UserInvite.accepted_at == None,
        models.UserInvite.expires_at > datetime.utcnow()
    ).first()
    
    if not invite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired invitation"
        )
    
    # Check if user already exists
    existing_user = db.query(models.User).filter(
        models.User.email == invite.email
    ).first()
    
    if existing_user:
        # User exists, just add to org membership
        existing_membership = db.query(models.OrgMembership).filter(
            models.OrgMembership.user_id == existing_user.id,
            models.OrgMembership.organisation_id == invite.organisation_id
        ).first()
        
        if existing_membership:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already a member of this organisation"
            )
        
        # Add membership
        membership = models.OrgMembership(
            user_id=existing_user.id,
            organisation_id=invite.organisation_id,
            role=invite.role
        )
        db.add(membership)
        invite.accepted_at = datetime.utcnow()
        db.commit()
        
        # Generate tokens
        tokens = create_tokens(db, existing_user)
        return tokens
    
    # Create new user
    password_hash = hash_password(request.password)
    
    new_user = models.User(
        email=invite.email,
        password_hash=password_hash,
        first_name=invite.first_name,
        last_name=invite.last_name,
        phone=request.phone,
        is_email_verified=True  # Email verified via invite
    )
    db.add(new_user)
    db.flush()
    
    # Create membership
    membership = models.OrgMembership(
        user_id=new_user.id,
        organisation_id=invite.organisation_id,
        role=invite.role
    )
    db.add(membership)
    
    # Mark invite as accepted
    invite.accepted_at = datetime.utcnow()
    db.commit()
    db.refresh(new_user)
    
    # Generate tokens
    tokens = create_tokens(db, new_user)
    return tokens


@router.get("/me", response_model=schemas.UserResponse)
def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user info."""
    return current_user


@router.patch("/me", response_model=schemas.UserResponse)
def update_current_user(
    request: schemas.UserUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update current user profile."""
    if request.first_name is not None:
        current_user.first_name = request.first_name
    if request.last_name is not None:
        current_user.last_name = request.last_name
    if request.phone is not None:
        current_user.phone = request.phone

    db.commit()
    db.refresh(current_user)
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


@router.get("/me/onboarding")
def get_onboarding_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's onboarding status."""
    return {
        "has_seen_tour": current_user.has_seen_tour or False,
        "onboarding_dismissed": current_user.onboarding_dismissed or False,
        "first_login_at": current_user.first_login_at,
        "is_new_user": current_user.first_login_at is None
    }


@router.patch("/me/onboarding")
def update_onboarding_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    has_seen_tour: bool = None,
    onboarding_dismissed: bool = None
):
    """Update current user's onboarding status."""
    if has_seen_tour is not None:
        current_user.has_seen_tour = has_seen_tour
    if onboarding_dismissed is not None:
        current_user.onboarding_dismissed = onboarding_dismissed
    
    db.commit()
    
    return {
        "has_seen_tour": current_user.has_seen_tour,
        "onboarding_dismissed": current_user.onboarding_dismissed
    }


@router.post("/me/first-login")
def record_first_login(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Record the first login time for the user."""
    if current_user.first_login_at is None:
        current_user.first_login_at = datetime.utcnow()
        db.commit()
        return {"is_first_login": True, "first_login_at": current_user.first_login_at}
    return {"is_first_login": False, "first_login_at": current_user.first_login_at}
