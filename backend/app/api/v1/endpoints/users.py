from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import os
import shutil

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.medical import MedicalHistory, EmergencyContact, HealthPreference
from app.schemas.schemas import (
    UserResponse, MedicalHistoryCreate, EmergencyContactCreate, HealthPreferenceUpdate
)

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_profile(
    full_name: str = None,
    age: int = None,
    phone: str = None,
    address: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if full_name:
        current_user.full_name = full_name
    if age:
        current_user.age = age
    if phone:
        current_user.phone = phone
    if address:
        current_user.address = address
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/upload-photo")
async def upload_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    upload_dir = "uploads/profiles"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = f"{upload_dir}/{current_user.id}_{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    current_user.profile_photo = f"/{file_path}"
    return {"url": current_user.profile_photo}


@router.get("/medical-history")
async def get_medical_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(MedicalHistory).where(MedicalHistory.user_id == current_user.id)
    )
    return result.scalars().all()


@router.post("/medical-history")
async def add_medical_history(
    data: MedicalHistoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = MedicalHistory(user_id=current_user.id, **data.model_dump())
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


@router.get("/emergency-contacts")
async def get_emergency_contacts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(EmergencyContact).where(EmergencyContact.user_id == current_user.id)
    )
    return result.scalars().all()


@router.post("/emergency-contacts")
async def add_emergency_contact(
    data: EmergencyContactCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contact = EmergencyContact(user_id=current_user.id, **data.model_dump())
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return contact


@router.get("/health-preferences")
async def get_health_preferences(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(HealthPreference).where(HealthPreference.user_id == current_user.id)
    )
    prefs = result.scalar_one_or_none()
    if not prefs:
        prefs = HealthPreference(user_id=current_user.id)
        db.add(prefs)
        await db.commit()
        await db.refresh(prefs)
    return prefs


@router.put("/health-preferences")
async def update_health_preferences(
    data: HealthPreferenceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(HealthPreference).where(HealthPreference.user_id == current_user.id)
    )
    prefs = result.scalar_one_or_none()
    if not prefs:
        prefs = HealthPreference(user_id=current_user.id)
        db.add(prefs)

    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(prefs, key, val)
    await db.commit()
    await db.refresh(prefs)
    return prefs
