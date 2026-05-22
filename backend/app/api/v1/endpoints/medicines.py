from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import os
import shutil
import json
import logging
import base64

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.medicine import Medicine, MedicineReminder, Prescription
from app.schemas.schemas import MedicineCreate, MedicineResponse

logger = logging.getLogger(__name__)

router = APIRouter()


class AnalyzePrescriptionRequest(BaseModel):
    ocr_text: str = ""
    disease_description: str = ""


class AIMedicineRecommendRequest(BaseModel):
    disease_description: str


@router.get("/", response_model=list[MedicineResponse])
async def get_medicines(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Medicine).where(Medicine.user_id == current_user.id).order_by(Medicine.name)
    )
    return result.scalars().all()


@router.post("/", response_model=MedicineResponse)
async def create_medicine(
    data: MedicineCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    medicine = Medicine(user_id=current_user.id, **data.model_dump())
    db.add(medicine)
    await db.commit()
    await db.refresh(medicine)
    return medicine


@router.put("/{medicine_id}", response_model=MedicineResponse)
async def update_medicine(
    medicine_id: int,
    data: MedicineCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Medicine).where(Medicine.id == medicine_id, Medicine.user_id == current_user.id)
    )
    medicine = result.scalar_one_or_none()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")

    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(medicine, key, val)
    await db.commit()
    await db.refresh(medicine)
    return medicine


@router.delete("/{medicine_id}")
async def delete_medicine(
    medicine_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Medicine).where(Medicine.id == medicine_id, Medicine.user_id == current_user.id)
    )
    medicine = result.scalar_one_or_none()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")

    await db.delete(medicine)
    await db.commit()
    return {"message": "Medicine deleted"}


@router.post("/scan-prescription")
async def scan_prescription(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a prescription image and analyze it using Groq Vision AI."""
    import time

    upload_dir = "uploads/prescriptions"
    os.makedirs(upload_dir, exist_ok=True)

    # Generate unique filename
    timestamp = int(time.time())
    safe_name = file.filename.replace(" ", "_") if file.filename else "prescription.jpg"
    file_path = f"{upload_dir}/{current_user.id}_{timestamp}_{safe_name}"

    # Read and save the file
    file_content = await file.read()
    with open(file_path, "wb") as buffer:
        buffer.write(file_content)

    # Convert image to base64 for Groq Vision
    image_base64 = base64.b64encode(file_content).decode("utf-8")

    # Detect mime type
    mime_type = file.content_type or "image/jpeg"
    if safe_name.lower().endswith(".png"):
        mime_type = "image/png"
    elif safe_name.lower().endswith((".jpg", ".jpeg")):
        mime_type = "image/jpeg"
    elif safe_name.lower().endswith(".webp"):
        mime_type = "image/webp"

    # Use Groq Vision to analyze the prescription image directly
    extracted_medicines = []
    ai_analysis = ""
    ocr_text = ""

    try:
        from groq import Groq
        client = Groq(api_key=settings.GROQ_API_KEY)

        completion = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": """You are an expert medical prescription reader. Analyze this prescription image carefully.
This may be HANDWRITTEN - read all handwritten text carefully.

Extract ALL medicines, dosages, frequencies, and instructions from the prescription.

You MUST respond with ONLY a valid JSON object in this exact format, no markdown, no code blocks:
{
  "doctor_name": "Dr. Name if visible",
  "patient_info": "Any patient info visible",
  "analysis": "Detailed description of what the prescription contains",
  "raw_text": "All text you can read from the prescription, line by line",
  "medicines": [
    {
      "name": "Medicine Name",
      "dosage": "500mg",
      "frequency": "Twice daily",
      "time_of_day": "Morning 8AM, Night 9PM",
      "duration": "7 days",
      "notes": "Take after meals",
      "type": "tablet"
    }
  ]
}

If you cannot read the prescription clearly, still try your best and note any uncertainty in the analysis field. Return whatever you can extract."""
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{image_base64}"
                            }
                        }
                    ],
                }
            ],
            temperature=0.2,
            max_tokens=3000,
        )

        response_text = completion.choices[0].message.content.strip()
        logger.info(f"Groq Vision response: {response_text[:300]}")

        # Clean markdown code blocks if present
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:])
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()

        parsed = json.loads(response_text)
        ai_analysis = parsed.get("analysis", "")
        ocr_text = parsed.get("raw_text", "")
        extracted_medicines = parsed.get("medicines", [])
        doctor_name = parsed.get("doctor_name", "")

        # Ensure all DB fields are strings (Groq may return lists)
        if isinstance(ocr_text, list):
            ocr_text = "\n".join(str(item) for item in ocr_text)
        if isinstance(ai_analysis, list):
            ai_analysis = "\n".join(str(item) for item in ai_analysis)
        if isinstance(doctor_name, list):
            doctor_name = ", ".join(str(item) for item in doctor_name)
        ocr_text = str(ocr_text) if ocr_text else ""
        ai_analysis = str(ai_analysis) if ai_analysis else ""
        doctor_name = str(doctor_name) if doctor_name else ""

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Groq Vision response: {e}")
        logger.error(f"Raw: {response_text[:500]}")
        ai_analysis = "Could not parse the prescription analysis. Please describe your condition manually."
        doctor_name = ""
    except Exception as e:
        logger.error(f"Groq Vision analysis failed: {e}")
        ai_analysis = f"Prescription analysis failed: {str(e)[:100]}. Please describe your condition manually."
        doctor_name = ""

    # Build the image URL that the frontend can access
    image_url = f"/uploads/prescriptions/{current_user.id}_{timestamp}_{safe_name}"

    # Save prescription to database
    prescription = Prescription(
        user_id=current_user.id,
        doctor_name=doctor_name if 'doctor_name' in dir() else "",
        image_url=image_url,
        ocr_text=ocr_text,
        prescription_text=ai_analysis,
    )
    db.add(prescription)
    await db.commit()
    await db.refresh(prescription)

    return {
        "prescription_id": prescription.id,
        "ocr_text": ocr_text,
        "ai_analysis": ai_analysis,
        "extracted_medicines": extracted_medicines,
        "image_url": image_url,
    }


@router.post("/ai-recommend")
async def ai_recommend_medicines(
    data: AIMedicineRecommendRequest,
    current_user: User = Depends(get_current_user),
):
    """Use Groq AI to recommend medicines based on disease/symptoms description."""
    from groq import Groq

    if not settings.GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured")

    try:
        client = Groq(api_key=settings.GROQ_API_KEY)

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": """You are a knowledgeable pharmacist assistant. Based on the patient's description of their disease or symptoms, recommend appropriate over-the-counter medicines and commonly prescribed medications.

IMPORTANT: Always include a disclaimer that the patient should consult a doctor before taking any medication.

You MUST respond with ONLY a valid JSON object in this exact format:
{
  "condition_summary": "Brief summary of the condition",
  "severity": "mild/moderate/severe",
  "see_doctor": true/false,
  "disclaimer": "Please consult a healthcare professional before taking any medication.",
  "medicines": [
    {
      "name": "Medicine Name (Generic)",
      "dosage": "500mg",
      "frequency": "Twice daily",
      "time_of_day": "Morning 8:00 AM, Night 9:00 PM",
      "duration": "5-7 days",
      "notes": "Take after meals. Avoid on empty stomach.",
      "type": "tablet/syrup/capsule/cream",
      "purpose": "For pain relief and fever"
    }
  ]
}

Provide 3-6 medicines with specific timings. Be realistic with dosages and timings."""
                },
                {
                    "role": "user",
                    "content": f"I am experiencing: {data.disease_description}\n\nPlease recommend medicines with exact dosage and timing."
                },
            ],
            temperature=0.4,
            max_tokens=2500,
        )

        response_text = completion.choices[0].message.content.strip()

        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()

        result = json.loads(response_text)
        return result

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI response: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse AI recommendations")
    except Exception as e:
        logger.error(f"Groq AI recommendation error: {e}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)[:100]}")


@router.post("/bulk-add")
async def bulk_add_medicines(
    medicines: list[MedicineCreate],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add multiple medicines at once (from AI recommendations)."""
    try:
        added = []
        for med_data in medicines:
            medicine = Medicine(user_id=current_user.id, **med_data.model_dump())
            db.add(medicine)
            added.append(medicine)

        await db.commit()
        for m in added:
            await db.refresh(m)

        return {"message": f"{len(added)} medicines added", "count": len(added)}
    except Exception as e:
        logger.error(f"Error in bulk-add: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to add medicines: {str(e)[:100]}")


@router.get("/prescriptions")
async def get_prescriptions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Prescription).where(Prescription.user_id == current_user.id).order_by(Prescription.created_at.desc())
    )
    return result.scalars().all()


@router.get("/reminders")
async def get_reminders(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(MedicineReminder)
        .join(Medicine)
        .where(Medicine.user_id == current_user.id)
        .order_by(MedicineReminder.reminder_time)
    )
    return result.scalars().all()
