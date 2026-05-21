from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.fitness import ChatHistory
from app.schemas.schemas import ChatMessage

logger = logging.getLogger(__name__)

router = APIRouter()

SYSTEM_PROMPT = """You are Khayal AI, a friendly and knowledgeable healthcare assistant. Your capabilities include:

1. **Symptom Analysis**: Help users understand their symptoms, possible causes, and when to seek medical attention.
2. **Medication Info**: Provide general information about medications, dosages, and side effects.
3. **Fitness & Nutrition**: Offer personalized fitness tips, workout suggestions, diet plans, and wellness advice.
4. **Mental Health**: Provide supportive guidance for stress, anxiety, and general mental well-being.
5. **Preventive Care**: Suggest preventive health measures, screenings, and healthy lifestyle habits.

Guidelines:
- Be warm, empathetic, and conversational.
- Provide detailed, actionable advice.
- Use bullet points and clear formatting when listing information.
- Always remind users to consult a healthcare professional for serious or persistent concerns.
- Never diagnose conditions definitively — frame suggestions as possibilities.
- If asked about the user's personal data (name, age, etc.), politely explain you can only see what they share in the conversation."""


async def get_groq_response(user_message: str, chat_history: list[dict]) -> str:
    """Call Groq API using the official SDK."""
    from groq import Groq

    api_key = settings.GROQ_API_KEY
    if not api_key:
        logger.error("GROQ_API_KEY is not set")
        return "I'm sorry, the AI service is not configured. Please contact the administrator."

    try:
        client = Groq(api_key=api_key)

        # Build messages with recent history for context
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        # Add last 10 messages for context
        for msg in chat_history[-10:]:
            messages.append({"role": msg["role"], "content": msg["content"]})

        # Add the current message
        messages.append({"role": "user", "content": user_message})

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.7,
            max_tokens=2048,
            top_p=0.9,
        )

        response = completion.choices[0].message.content
        logger.info(f"Groq response received: {len(response)} chars")
        return response

    except Exception as e:
        logger.error(f"Groq API error: {e}")
        return f"I apologize, but I'm having trouble connecting to my AI services right now. Error: {str(e)[:100]}. Please try again in a moment."


@router.post("/chat")
async def chat(
    data: ChatMessage,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Save user message
    user_msg = ChatHistory(user_id=current_user.id, role="user", content=data.message)
    db.add(user_msg)

    # Get recent chat history for context
    result = await db.execute(
        select(ChatHistory)
        .where(ChatHistory.user_id == current_user.id)
        .order_by(ChatHistory.created_at.desc())
        .limit(10)
    )
    history_rows = result.scalars().all()
    chat_history = [
        {"role": row.role, "content": row.content}
        for row in reversed(history_rows)
    ]

    # Get AI response
    groq_response = await get_groq_response(data.message, chat_history)

    # Save assistant message
    assistant_msg = ChatHistory(user_id=current_user.id, role="assistant", content=groq_response)
    db.add(assistant_msg)
    await db.commit()

    return {"response": groq_response}


@router.get("/history")
async def get_chat_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ChatHistory)
        .where(ChatHistory.user_id == current_user.id)
        .order_by(ChatHistory.created_at.asc())
        .limit(50)
    )
    return result.scalars().all()


@router.post("/clear-history")
async def clear_chat_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ChatHistory).where(ChatHistory.user_id == current_user.id)
    )
    for msg in result.scalars().all():
        await db.delete(msg)
    await db.commit()
    return {"message": "Chat history cleared"}
