from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, appointments, medicines, fitness, admin, chatbot, labs

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(appointments.router, prefix="/appointments", tags=["Appointments"])
api_router.include_router(medicines.router, prefix="/medicines", tags=["Medicines"])
api_router.include_router(fitness.router, prefix="/fitness", tags=["Fitness"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(chatbot.router, prefix="/chatbot", tags=["AI Chatbot"])
api_router.include_router(labs.router, prefix="/labs", tags=["Lab Tests"])
