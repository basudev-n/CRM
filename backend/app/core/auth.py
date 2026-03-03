from typing import Optional
from fastapi import Header, HTTPException, status, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import service
from app import models


def get_current_user(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
) -> models.User:
    """Get current authenticated user from JWT token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.split(" ")[1]
    try:
        user = service.get_current_user(db, token)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def get_current_active_user(
    current_user: models.User = Depends(get_current_user)
) -> models.User:
    """Get current active user."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )
    return current_user


def get_current_org(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
) -> Optional[models.Organisation]:
    """Get current user's organisation."""
    membership = db.query(models.OrgMembership).filter(
        models.OrgMembership.user_id == current_user.id,
        models.OrgMembership.is_active == True
    ).first()

    return membership.organisation if membership else None


def require_org(
    current_org: Optional[models.Organisation] = Depends(get_current_org)
) -> models.Organisation:
    """Require current user to have an organisation."""
    if not current_org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No organisation found. Please create one first."
        )
    return current_org


def require_role(*allowed_roles: models.UserRole):
    """Dependency factory to require specific roles."""
    def role_checker(
        db: Session = Depends(get_db),
        current_user: models.User = Depends(get_current_user)
    ) -> models.User:
        membership = db.query(models.OrgMembership).filter(
            models.OrgMembership.user_id == current_user.id,
            models.OrgMembership.is_active == True
        ).first()

        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No organisation membership found"
            )

        if membership.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {[r.value for r in allowed_roles]}"
            )

        return current_user

    return role_checker
