from fastapi import APIRouter, Depends, HTTPException, status, Header, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.auth import service
from app import schemas
from app.models import User, EmailOTP, RefreshToken
from app.config import settings
from app.utils.email import send_otp_email
import random
import string
from datetime import datetime, timedelta
import httpx
import secrets
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


def generate_otp():
    return ''.join(random.choices(string.digits, k=6))


@router.post("/signup/initiate", summary="Initiate signup with email OTP",
             description="Send a 6-digit OTP to the provided email address to begin the signup process. OTP expires in 10 minutes.")
def initiate_signup(request: schemas.SendOTPRequest, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    otp = generate_otp()
    db.query(EmailOTP).filter(EmailOTP.email == request.email).delete()

    otp_record = EmailOTP(
        email=request.email,
        otp=otp,
        purpose="signup",
        expires_at=datetime.utcnow() + timedelta(minutes=10)
    )
    db.add(otp_record)
    db.commit()

    # Send OTP via email
    email_sent = send_otp_email(request.email, otp, purpose="signup")
    if not email_sent:
        logger.warning(f"Email not sent for {request.email} — RESEND_API_KEY may not be configured")

    return {"message": "OTP sent successfully"}


@router.post("/signup/verify", summary="Verify email OTP",
             description="Verify the OTP sent to email. Must be called before completing signup.")
def verify_signup(request: schemas.VerifyOTPRequest, db: Session = Depends(get_db)):
    otp_record = db.query(EmailOTP).filter(
        EmailOTP.email == request.email,
        EmailOTP.otp == request.otp,
        EmailOTP.purpose == "signup",
        EmailOTP.expires_at > datetime.utcnow(),
        EmailOTP.is_verified == False
    ).first()

    if not otp_record:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP")

    otp_record.is_verified = True
    db.commit()

    return {"message": "OTP verified successfully", "verified": True}


@router.post("/signup", response_model=schemas.TokenResponse, summary="Complete signup",
             description="Complete user registration after email verification. Returns JWT access and refresh tokens.")
def signup(request: schemas.CompleteSignupRequest, db: Session = Depends(get_db)):
    otp_record = db.query(EmailOTP).filter(
        EmailOTP.email == request.email,
        EmailOTP.otp == request.otp,
        EmailOTP.purpose == "signup",
        EmailOTP.expires_at > datetime.utcnow(),
        EmailOTP.is_verified == True
    ).first()

    if not otp_record:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please verify your email first")

    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    try:
        user, tokens = service.complete_signup(db, request)
        db.delete(otp_record)
        db.commit()
        return tokens
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/login", response_model=schemas.TokenResponse, summary="User login",
             description="Authenticate user with email and password. Returns JWT access and refresh tokens.")
def login(request: schemas.LoginRequest, db: Session = Depends(get_db)):
    try:
        user, tokens = service.login(db, request)
        return tokens
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/refresh", response_model=schemas.TokenResponse, summary="Refresh access token",
             description="Get a new access token using a valid refresh token.")
def refresh_token(request: schemas.RefreshTokenRequest, db: Session = Depends(get_db)):
    try:
        tokens = service.refresh_access_token(db, request.refresh_token)
        return tokens
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.get("/me", response_model=schemas.UserResponse, summary="Get current user",
            description="Get the authenticated user's profile and organisation membership details.")
def get_me(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")

    token = authorization.split(" ")[1]
    try:
        user = service.get_current_user(db, token)
        return user
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


# ============== GOOGLE OAUTH ==============

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


@router.get("/google/url", summary="Get Google OAuth URL",
            description="Get the Google OAuth authorization URL. Redirect user to this URL to initiate Google sign-in.")
def get_google_auth_url(
    redirect_uri: str = Query(None, description="Frontend callback URL")
):
    """Get Google OAuth URL for sign-in/sign-up."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
        )
    
    # Use provided redirect_uri or default to frontend
    callback_uri = redirect_uri or f"{settings.FRONTEND_BASE_URL}/auth/google/callback"
    
    # Generate state for CSRF protection
    state = secrets.token_urlsafe(32)
    
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": callback_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "state": state,
        "prompt": "select_account",
    }
    
    query_string = "&".join(f"{k}={v}" for k, v in params.items())
    auth_url = f"{GOOGLE_AUTH_URL}?{query_string}"
    
    return {"url": auth_url, "state": state}


@router.post("/google/callback", response_model=schemas.TokenResponse, summary="Google OAuth callback",
             description="Exchange Google authorization code for tokens. Creates user if not exists.")
async def google_callback(
    code: str = Query(..., description="Authorization code from Google"),
    redirect_uri: str = Query(None, description="Same redirect_uri used in authorization"),
    db: Session = Depends(get_db)
):
    """Handle Google OAuth callback - exchange code for tokens and create/login user."""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth is not configured"
        )
    
    callback_uri = redirect_uri or f"{settings.FRONTEND_BASE_URL}/auth/google/callback"
    
    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": callback_uri,
            }
        )
        
        if token_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to exchange code: {token_response.text}"
            )
        
        token_data = token_response.json()
        google_access_token = token_data.get("access_token")
        
        # Get user info from Google
        userinfo_response = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {google_access_token}"}
        )
        
        if userinfo_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get user info from Google"
            )
        
        google_user = userinfo_response.json()
    
    email = google_user.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not provided by Google"
        )
    
    # Check if user exists
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        # Create new user from Google data
        user = User(
            email=email,
            password_hash="",  # No password for OAuth users
            first_name=google_user.get("given_name", email.split("@")[0]),
            last_name=google_user.get("family_name", ""),
            avatar=google_user.get("picture"),
            is_email_verified=True,  # Google emails are verified
            google_id=google_user.get("id"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update Google ID if not set
        if not user.google_id:
            user.google_id = google_user.get("id")
        # Update avatar if not set
        if not user.avatar and google_user.get("picture"):
            user.avatar = google_user.get("picture")
        db.commit()
    
    # Generate JWT tokens
    jwt_data = {"sub": str(user.id), "email": user.email}
    access_token = service.create_access_token(jwt_data)
    refresh_token = service.create_refresh_token(jwt_data)
    
    # Store refresh token
    refresh_token_obj = RefreshToken(
        token=refresh_token,
        user_id=user.id,
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(refresh_token_obj)
    db.commit()
    
    return schemas.TokenResponse(access_token=access_token, refresh_token=refresh_token)
