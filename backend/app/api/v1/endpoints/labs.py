from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from datetime import date

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.fitness import LabTest
from app.schemas.schemas import LabTestCreate

router = APIRouter()


@router.get("")
async def get_lab_tests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(LabTest).where(LabTest.user_id == current_user.id).order_by(LabTest.created_at.desc())
    )
    return result.scalars().all()


@router.post("")
async def book_lab_test(
    data: LabTestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    test = LabTest(user_id=current_user.id, **data.model_dump())
    db.add(test)
    await db.commit()
    await db.refresh(test)
    return test


@router.get("/search-labs")
async def search_labs(
    test_type: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
):
    mock_labs = [
        {"name": "City Diagnostic Center", "address": "100 Health Ave", "phone": "+1-555-0200", "test_types": ["Blood Test", "X-Ray", "MRI"], "lat": 40.7128, "lng": -74.0060},
        {"name": "Metro Lab Services", "address": "200 Wellness Rd", "phone": "+1-555-0201", "test_types": ["Blood Test", "Urine Test", "CT Scan"], "lat": 40.7138, "lng": -74.0065},
        {"name": "Precision Health Labs", "address": "300 Care Blvd", "phone": "+1-555-0202", "test_types": ["MRI", "X-Ray", "ECG"], "lat": 40.7148, "lng": -74.0070},
        {"name": "Quick Test Center", "address": "400 Fast Ln", "phone": "+1-555-0203", "test_types": ["COVID Test", "Blood Test", "Urine Test"], "lat": 40.7158, "lng": -74.0075},
    ]

    if test_type:
        mock_labs = [l for l in mock_labs if test_type.lower() in [t.lower() for t in l["test_types"]]]

    return {"labs": mock_labs}
