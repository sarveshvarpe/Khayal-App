from datetime import datetime, timezone, date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from pydantic import BaseModel
import logging
import json

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.appointment import Appointment, AppointmentStatus
from app.schemas.schemas import AppointmentCreate, AppointmentResponse

logger = logging.getLogger(__name__)

router = APIRouter()


class DoctorSearchRequest(BaseModel):
    latitude: float
    longitude: float
    city: str = ""
    disease: str = ""
    specialization: str = ""


@router.get("", response_model=list[AppointmentResponse])
async def get_appointments(
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Appointment).where(Appointment.user_id == current_user.id)
    if status_filter:
        query = query.where(Appointment.status == status_filter)
    query = query.order_by(Appointment.appointment_date.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=AppointmentResponse)
async def create_appointment(
    data: AppointmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        appointment = Appointment(user_id=current_user.id, **data.model_dump())
        db.add(appointment)
        await db.commit()
        await db.refresh(appointment)
        return appointment
    except Exception as e:
        logger.error(f"Error creating appointment: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create appointment: {str(e)[:100]}")


@router.put("/{appointment_id}/cancel")
async def cancel_appointment(
    appointment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Appointment).where(
            Appointment.id == appointment_id,
            Appointment.user_id == current_user.id,
        )
    )
    appointment = result.scalar_one_or_none()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    appointment.status = AppointmentStatus.CANCELLED
    await db.commit()
    return {"message": "Appointment cancelled"}


@router.put("/{appointment_id}/rate")
async def rate_appointment(
    appointment_id: int,
    rating: int,
    review: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Appointment).where(
            Appointment.id == appointment_id,
            Appointment.user_id == current_user.id,
        )
    )
    appointment = result.scalar_one_or_none()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    appointment.rating = rating
    if review:
        appointment.review = review
    await db.commit()
    return {"message": "Rating submitted"}


@router.post("/search-doctors")
async def search_doctors_ai(data: DoctorSearchRequest):
    """Use Groq AI to find and suggest doctors based on location and disease."""
    from groq import Groq

    api_key = settings.GROQ_API_KEY
    if not api_key:
        raise HTTPException(status_code=500, detail="AI service not configured")

    location_info = data.city if data.city else f"coordinates ({data.latitude}, {data.longitude})"
    condition = data.disease or data.specialization or "general health checkup"

    prompt = f"""You are a healthcare directory assistant. A patient is located in {location_info} (latitude: {data.latitude}, longitude: {data.longitude}).

They are looking for doctors for: {condition}

Please suggest 6-8 real, well-known doctors or medical facilities in or near {location_info} that specialize in treating {condition}.

For each doctor/facility, provide REAL information to the best of your knowledge. If you don't know exact details for that specific city, provide realistic and helpful suggestions based on well-known hospitals and medical centers in that area.

You MUST respond with ONLY a valid JSON array, no other text. Each object must have these exact fields:
[
  {{
    "name": "Dr. Full Name",
    "specialization": "Their specialty relevant to the condition",
    "hospital": "Hospital or Clinic name",
    "address": "Full street address in {location_info}",
    "phone": "Phone number (use realistic format for the region)",
    "rating": 4.5,
    "experience": "15 years",
    "consultation_fee": "₹500",
    "available_days": "Mon-Sat",
    "lat": {data.latitude + 0.001},
    "lng": {data.longitude + 0.001}
  }}
]

Important:
- Provide doctors that are relevant to "{condition}"
- Use realistic addresses for {location_info}
- Vary the lat/lng slightly around the patient's location (within 0.01-0.05 degrees)
- Include a mix of hospitals and private clinics
- Use the local currency for consultation fees
- Respond with ONLY the JSON array, nothing else"""

    try:
        client = Groq(api_key=api_key)
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a medical directory assistant. Always respond with valid JSON only. No markdown, no code blocks, no explanations."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.6,
            max_tokens=3000,
        )

        response_text = completion.choices[0].message.content.strip()
        logger.info(f"Groq doctor search response length: {len(response_text)}")

        # Clean up response - remove markdown code blocks if present
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()

        doctors = json.loads(response_text)

        if not isinstance(doctors, list):
            raise ValueError("Response is not a list")

        # Ensure all required fields exist
        cleaned = []
        for d in doctors:
            cleaned.append({
                "name": d.get("name", "Unknown Doctor"),
                "specialization": d.get("specialization", condition),
                "hospital": d.get("hospital", ""),
                "address": d.get("address", location_info),
                "phone": d.get("phone", "N/A"),
                "rating": d.get("rating", 4.0),
                "experience": d.get("experience", "N/A"),
                "consultation_fee": d.get("consultation_fee", "N/A"),
                "available_days": d.get("available_days", "Mon-Sat"),
                "lat": float(d.get("lat", data.latitude + 0.01)),
                "lng": float(d.get("lng", data.longitude + 0.01)),
            })

        return {"doctors": cleaned, "location": location_info, "condition": condition}

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Groq response as JSON: {e}")
        logger.error(f"Raw response: {response_text[:500]}")
        raise HTTPException(status_code=500, detail="Failed to parse doctor suggestions")
    except Exception as e:
        logger.error(f"Groq doctor search error: {e}")
        raise HTTPException(status_code=500, detail=f"AI search failed: {str(e)[:100]}")


@router.get("/search-doctors")
async def search_doctors_get(
    specialization: Optional[str] = None,
    disease: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
):
    """Legacy GET endpoint - returns empty until user provides location."""
    return {"doctors": [], "message": "Please use the search feature to find doctors near you"}
