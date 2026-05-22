from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.fitness import FitnessProgress
from app.models.appointment import Appointment
from app.models.medicine import Medicine
from app.schemas.schemas import FitnessProgressCreate

router = APIRouter()


@router.get("/progress")
async def get_fitness_progress(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(FitnessProgress)
        .where(FitnessProgress.user_id == current_user.id)
        .order_by(FitnessProgress.date.asc())
        .limit(30)
    )
    return result.scalars().all()


@router.post("/progress")
async def add_fitness_progress(
    data: FitnessProgressCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        # 1. Find all existing duplicate entries for the same user and date
        result = await db.execute(
            select(FitnessProgress).where(
                FitnessProgress.user_id == current_user.id,
                FitnessProgress.date == data.date
            )
        )
        existing_rows = result.scalars().all()

        # 2. Delete ALL matching rows to resolve duplicate MultipleResultsFound issues
        for row in existing_rows:
            await db.delete(row)

        # 3. Create NEW fresh record
        new_progress = FitnessProgress(user_id=current_user.id, **data.model_dump())
        db.add(new_progress)

        await db.commit()
        await db.refresh(new_progress)
        return new_progress
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to add fitness progress: {str(e)[:100]}")


@router.get("/stats")
async def get_fitness_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    result = await db.execute(
        select(FitnessProgress).where(
            FitnessProgress.user_id == current_user.id,
            FitnessProgress.date == today,
        )
    )
    today_data = result.scalar_one_or_none()

    week_result = await db.execute(
        select(func.avg(FitnessProgress.steps), func.avg(FitnessProgress.calories))
        .where(FitnessProgress.user_id == current_user.id)
    )
    week_avg = week_result.one()

    return {
        "today": {
            "steps": today_data.steps if today_data else 0,
            "calories": today_data.calories if today_data else 0,
            "water_intake": today_data.water_intake if today_data else 0,
            "sleep_hours": today_data.sleep_hours if today_data else 0,
        },
        "weekly_avg": {
            "steps": round(week_avg[0] or 0),
            "calories": round(week_avg[1] or 0, 1),
        },
    }


@router.post("/bmi")
async def calculate_bmi(height: float, weight: float):
    if height <= 0:
        raise HTTPException(status_code=400, detail="Height must be positive")
    bmi = weight / ((height / 100) ** 2)
    category = "Underweight" if bmi < 18.5 else "Normal" if bmi < 25 else "Overweight" if bmi < 30 else "Obese"
    return {"bmi": round(bmi, 2), "category": category}
