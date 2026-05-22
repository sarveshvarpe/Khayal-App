from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime, date


class UserBase(BaseModel):
    full_name: str
    email: str
    age: Optional[int] = None


class UserCreate(UserBase):
    password: str
    confirm_password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(UserBase):
    id: int
    role: str
    is_verified: bool
    is_active: bool
    profile_photo: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class OTPRequest(BaseModel):
    email: str


class OTPVerify(BaseModel):
    email: str
    otp: str


class GoogleAuth(BaseModel):
    token: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str
    confirm_password: str


class MedicalHistoryCreate(BaseModel):
    condition: str
    diagnosis_date: Optional[date] = None
    notes: Optional[str] = None


class EmergencyContactCreate(BaseModel):
    name: str
    phone: str
    relationship: Optional[str] = None


class HealthPreferenceUpdate(BaseModel):
    dietary_preferences: Optional[str] = None
    allergies: Optional[str] = None
    blood_group: Optional[str] = None
    height: Optional[int] = None
    weight: Optional[int] = None


class AppointmentCreate(BaseModel):
    doctor_name: str
    doctor_specialization: str
    doctor_address: Optional[str] = None
    doctor_phone: Optional[str] = None
    doctor_lat: Optional[float] = None
    doctor_lng: Optional[float] = None
    appointment_date: date
    appointment_time: str
    notes: Optional[str] = None


class AppointmentResponse(BaseModel):
    id: int
    doctor_name: str
    doctor_specialization: str
    appointment_date: date
    appointment_time: str
    status: Optional[str] = "scheduled"
    notes: Optional[str] = None
    rating: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class MedicineCreate(BaseModel):
    name: str
    dosage: str
    frequency: str
    time_of_day: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    stock_count: Optional[int] = 0
    stock_refill_threshold: Optional[int] = 5
    notes: Optional[str] = None


class MedicineResponse(BaseModel):
    id: int
    name: str
    dosage: str
    frequency: str
    time_of_day: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    stock_count: Optional[int] = None
    stock_refill_threshold: Optional[int] = None
    is_active: bool
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class LabTestCreate(BaseModel):
    lab_name: str
    lab_address: Optional[str] = None
    lab_phone: Optional[str] = None
    test_type: str
    appointment_date: Optional[date] = None
    appointment_time: Optional[str] = None
    notes: Optional[str] = None


class ChatMessage(BaseModel):
    message: str


class FitnessProgressCreate(BaseModel):
    weight: Optional[float] = None
    height: Optional[float] = None
    steps: Optional[int] = 0
    calories: Optional[float] = 0
    water_intake: Optional[int] = 0
    sleep_hours: Optional[float] = 0
    date: date
