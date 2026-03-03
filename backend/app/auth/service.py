from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.config import settings
from app import models
from app.schemas import SignUpRequest, LoginRequest, TokenResponse, UserResponse, OrganisationCreate, CompleteSignupRequest

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


def complete_signup(db: Session, request: CompleteSignupRequest) -> tuple[models.User, TokenResponse]:
    """Complete signup after OTP verification"""
    # Create user with verified email
    user = models.User(
        email=request.email,
        password_hash=get_password_hash(request.password),
        first_name=request.first_name,
        last_name=request.last_name,
        phone=request.phone,
        is_email_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Generate tokens
    token_data = {"sub": str(user.id), "email": user.email}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    # Store refresh token
    refresh_token_obj = models.RefreshToken(
        token=refresh_token,
        user_id=user.id,
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(refresh_token_obj)
    db.commit()

    return user, TokenResponse(access_token=access_token, refresh_token=refresh_token)


def login(db: Session, request: LoginRequest) -> tuple[models.User, TokenResponse]:
    user = db.query(models.User).filter(models.User.email == request.email).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise ValueError("Invalid email or password")

    if not user.is_active:
        raise ValueError("Account is deactivated")

    # Generate tokens
    token_data = {"sub": str(user.id), "email": user.email}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    # Store refresh token
    refresh_token_obj = models.RefreshToken(
        token=refresh_token,
        user_id=user.id,
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(refresh_token_obj)
    db.commit()

    return user, TokenResponse(access_token=access_token, refresh_token=refresh_token)


def refresh_access_token(db: Session, refresh_token: str) -> TokenResponse:
    # Validate refresh token
    token_obj = db.query(models.RefreshToken).filter(
        models.RefreshToken.token == refresh_token,
        models.RefreshToken.expires_at > datetime.utcnow()
    ).first()

    if not token_obj:
        raise ValueError("Invalid or expired refresh token")

    user = token_obj.user
    if not user.is_active:
        raise ValueError("Account is deactivated")

    # Generate new access token
    token_data = {"sub": str(user.id), "email": user.email}
    access_token = create_access_token(token_data)

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


def get_current_user(db: Session, token: str) -> models.User:
    payload = decode_token(token)
    if not payload:
        raise ValueError("Invalid token")

    if payload.get("type") != "access":
        raise ValueError("Invalid token type")

    user_id = payload.get("sub")
    if not user_id:
        raise ValueError("Invalid token payload")

    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if not user:
        raise ValueError("User not found")

    return user


def create_organisation(db: Session, user: models.User, request: OrganisationCreate) -> models.Organisation:
    # Check if user already has an organisation (they shouldn't as owner)
    membership = db.query(models.OrgMembership).filter(
        models.OrgMembership.user_id == user.id,
        models.OrgMembership.role == models.UserRole.OWNER
    ).first()

    if membership:
        raise ValueError("User already has an organisation")

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
        user_id=user.id,
        organisation_id=organisation.id,
        role=models.UserRole.OWNER,
    )
    db.add(membership)
    db.commit()
    db.refresh(organisation)

    return organisation


def get_user_memberships(db: Session, user: models.User) -> list[models.OrgMembership]:
    return db.query(models.OrgMembership).filter(
        models.OrgMembership.user_id == user.id,
        models.OrgMembership.is_active == True
    ).all()
