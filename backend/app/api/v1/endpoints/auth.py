from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import random
import json
import uuid
import traceback

from app.core.database import get_db
from app.core.security import (
    hash_password, verify_password, create_access_token,
    create_refresh_token, decode_token, get_current_user
)
from app.core.config import settings
from app.core.redis import otp_store
from app.core.email import send_otp_email, send_reset_password_email
from app.models.user import User, UserRole
from app.schemas.schemas import (
    UserCreate, UserLogin, UserResponse, TokenResponse,
    OTPRequest, OTPVerify, GoogleAuth, RefreshTokenRequest,
    ForgotPasswordRequest, ResetPasswordRequest
)

router = APIRouter()


@router.post("/signup", response_model=TokenResponse)
async def signup(data: UserCreate, db: AsyncSession = Depends(get_db)):
    if data.password != data.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    existing = await db.execute(select(User).where(User.email == data.email))
    existing_user = existing.scalar_one_or_none()
    if existing_user:
        if existing_user.is_verified:
            raise HTTPException(status_code=400, detail="Email already registered")
        # Update the existing unverified user in-place instead of deleting
        # (deleting would violate FK constraints from prescriptions, appointments, etc.)
        existing_user.full_name = data.full_name
        existing_user.age = data.age
        existing_user.password_hash = hash_password(data.password)
        await db.commit()
        await db.refresh(existing_user)
        user = existing_user
    else:
        user = User(
            full_name=data.full_name,
            email=data.email,
            age=data.age,
            password_hash=hash_password(data.password),
            role=UserRole.PATIENT,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    # Note: OTP is sent separately via /send-otp called by the frontend after signup
    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/send-otp")
async def send_otp(data: OTPRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    otp = str(random.randint(100000, 999999))
    await otp_store.set(f"otp:{data.email}", otp, 300)
    
    try:
        await send_otp_email(data.email, otp)
        return {"message": "OTP sent to your email", "sent": True}
    except Exception as e:
        print("SEND OTP EMAIL ERROR:", str(e))
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


@router.post("/verify-otp")
async def verify_otp(data: OTPVerify, db: AsyncSession = Depends(get_db)):
    stored_otp = await otp_store.get(f"otp:{data.email}")

    if not stored_otp or stored_otp != data.otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if user:
        user.is_verified = True
        await db.commit()

    await otp_store.delete(f"otp:{data.email}")
    return {"message": "Email verified successfully"}


@router.post("/resend-otp")
async def resend_otp(data: OTPRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    otp = str(random.randint(100000, 999999))
    await otp_store.set(f"otp:{data.email}", otp, 300)
    
    try:
        await send_otp_email(data.email, otp)
        return {"message": "OTP resent to your email", "sent": True}
    except Exception as e:
        print("RESEND OTP EMAIL ERROR:", str(e))
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to resend email: {str(e)}")


@router.post("/google", response_model=TokenResponse)
async def google_auth(data: GoogleAuth, db: AsyncSession = Depends(get_db)):
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests

    try:
        google_data = id_token.verify_oauth2_token(
            data.token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    email = google_data.get("email")
    name = google_data.get("name", "")

    if not email:
        raise HTTPException(status_code=401, detail="Google account has no email")

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            full_name=name,
            email=email,
            google_id=google_data.get("sub"),
            is_verified=True,
            role=UserRole.PATIENT,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    access_token = create_access_token({"sub": str(user.id)})
    new_refresh_token = create_refresh_token({"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    
    if not user:
        # Security: Do not reveal if the email exists or not
        return {"message": "If an account with this email exists, a reset link has been sent.", "sent": True}

    otp = str(uuid.uuid4())
    await otp_store.set(f"reset_otp:{data.email}", otp, 900)  # 15 mins
    
    try:
        await send_reset_password_email(data.email, otp)
        return {"message": "If an account with this email exists, a reset link has been sent.", "sent": True}
    except Exception as e:
        print("FORGOT PASSWORD EMAIL ERROR:", str(e))
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"SMTP authentication failed: {str(e)}")


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    if data.new_password != data.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    stored_otp = await otp_store.get(f"reset_otp:{data.email}")

    if not stored_otp or stored_otp != data.otp:
        raise HTTPException(status_code=400, detail="Reset link expired or invalid")

    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = hash_password(data.new_password)
    await db.commit()
    await otp_store.delete(f"reset_otp:{data.email}")

    return {"message": "Password reset successfully"}


@router.get("/test-email")
async def test_email():
    from app.core.email import send_email
    try:
        await send_email("developer@khayal.com", "Test Email", "<p>This is a test email</p>")
        return {"success": True, "message": "Email sent successfully (or would have if real address)"}
    except Exception as e:
        print("TEST EMAIL ERROR:", str(e))
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Exception occurred: {str(e)}")
