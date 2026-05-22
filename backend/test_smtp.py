import asyncio
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from app.core.config import settings

conf = ConnectionConfig(
    MAIL_USERNAME=settings.SMTP_USER,
    MAIL_PASSWORD=settings.SMTP_PASSWORD.replace(" ", ""),
    MAIL_FROM=settings.SMTP_USER,
    MAIL_PORT=465,
    MAIL_SERVER="smtp.gmail.com",
    MAIL_STARTTLS=False,
    MAIL_SSL_TLS=True,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True,
    TIMEOUT=10
)

async def test():
    message = MessageSchema(
        subject="Test",
        recipients=["sarveshvarpe4@gmail.com"],
        body="Test",
        subtype=MessageType.html
    )
    fm = FastMail(conf)
    try:
        await fm.send_message(message)
        print("Success!")
    except Exception as e:
        print("Failed:", str(e))

asyncio.run(test())
