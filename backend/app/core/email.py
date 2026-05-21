import logging
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_email(to: str, subject: str, body: str) -> bool:
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("SMTP credentials not configured — set SMTP_USER and SMTP_PASSWORD in .env")
        return False

    msg = MIMEMultipart("alternative")
    msg["From"] = settings.SMTP_USER
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "html"))

    try:
        logger.info(f"Connecting to SMTP {settings.SMTP_HOST}:{settings.SMTP_PORT} for {to}")
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            use_tls=False,
            start_tls=True,
        )
        logger.info(f"Email sent successfully to {to}")
        return True
    except aiosmtplib.SMTPAuthenticationError as e:
        logger.error(f"SMTP authentication failed — check SMTP_USER/SMTP_PASSWORD in .env: {e}")
        return False
    except aiosmtplib.SMTPConnectError as e:
        logger.error(f"SMTP connection failed to {settings.SMTP_HOST}:{settings.SMTP_PORT}: {e}")
        return False
    except Exception as e:
        logger.error(f"Failed to send email to {to}: {type(e).__name__}: {e}")
        return False


async def send_otp_email(email: str, otp: str) -> bool:
    subject = "Your Khayal OTP Code"
    body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #22c55e;">Khayal Healthcare</h2>
        <p>Your one-time password (OTP) is:</p>
        <h1 style="font-size: 32px; letter-spacing: 8px; background: #f0fdf4; padding: 16px; text-align: center; border-radius: 8px;">{otp}</h1>
        <p>This code expires in 5 minutes.</p>
        <p style="color: #666; font-size: 12px;">If you didn't request this, please ignore this email.</p>
    </body>
    </html>
    """
    return await send_email(email, subject, body)

