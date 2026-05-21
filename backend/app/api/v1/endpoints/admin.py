from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.user import User, UserRole
from app.models.appointment import Appointment
from app.models.fitness import ActivityLog

router = APIRouter()


async def verify_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("/users")
async def admin_get_users(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(verify_admin),
):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()


@router.get("/analytics")
async def admin_analytics(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(verify_admin),
):
    total_users = await db.scalar(select(func.count(User.id)))
    total_appointments = await db.scalar(select(func.count(Appointment.id)))
    verified_users = await db.scalar(select(func.count(User.id)).where(User.is_verified == True))

    return {
        "total_users": total_users or 0,
        "total_appointments": total_appointments or 0,
        "verified_users": verified_users or 0,
        "appointments_by_status": {},
        "users_by_role": {},
    }


@router.get("/activity-logs")
async def admin_activity_logs(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(verify_admin),
):
    result = await db.execute(
        select(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(100)
    )
    return result.scalars().all()


@router.put("/users/{user_id}/role")
async def admin_update_role(
    user_id: int,
    role: UserRole,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(verify_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = role
    await db.commit()
    return {"message": f"User role updated to {role.value}"}
