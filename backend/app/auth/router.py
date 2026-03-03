from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.auth import service
from app import schemas
from app.models import User, EmailOTP
import random
import string
from datetime import datetime, timedelta

router = APIRouter(prefix="/auth", tags=["auth"])


def generate_otp():
    return ''.join(random.choices(string.digits, k=6))


@router.post("/signup/initiate")
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

    return {"message": "OTP sent successfully", "otp": otp}


@router.post("/signup/verify")
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


@router.post("/signup", response_model=schemas.TokenResponse)
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


@router.post("/login", response_model=schemas.TokenResponse)
def login(request: schemas.LoginRequest, db: Session = Depends(get_db)):
    try:
        user, tokens = service.login(db, request)
        return tokens
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/refresh", response_model=schemas.TokenResponse)
def refresh_token(request: schemas.RefreshTokenRequest, db: Session = Depends(get_db)):
    try:
        tokens = service.refresh_access_token(db, request.refresh_token)
        return tokens
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.get("/me", response_model=schemas.UserResponse)
def get_me(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")

    token = authorization.split(" ")[1]
    try:
        user = service.get_current_user(db, token)
        return user
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
