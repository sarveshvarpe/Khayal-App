from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Enum, Float, Date
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class AppointmentStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    PENDING = "pending"


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    doctor_name = Column(String(255), nullable=False)
    doctor_specialization = Column(String(255), nullable=False)
    doctor_address = Column(Text, nullable=True)
    doctor_phone = Column(String(20), nullable=True)
    doctor_lat = Column(Float, nullable=True)
    doctor_lng = Column(Float, nullable=True)
    appointment_date = Column(Date, nullable=False)
    appointment_time = Column(String(50), nullable=False)
    status = Column(Enum(AppointmentStatus), default=AppointmentStatus.SCHEDULED)
    notes = Column(Text, nullable=True)
    rating = Column(Integer, nullable=True)
    review = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="appointments")
    prescriptions = relationship("Prescription", back_populates="appointment", cascade="all, delete-orphan")
