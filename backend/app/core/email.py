import logging
import traceback
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from app.core.config import settings
from pydantic import EmailStr

logger = logging.getLogger(__name__)

# FastAPI-Mail Connection Config
# The user specifically requested 60s timeout, STARTTLS, and Gmail SMTP settings
# using existing Railway env vars.
try:
    conf = ConnectionConfig(
        MAIL_USERNAME=settings.SMTP_USER,
        MAIL_PASSWORD=settings.SMTP_PASSWORD,
        MAIL_FROM=settings.SMTP_USER,  # Always fallback to SMTP_USER as requested
        MAIL_PORT=settings.SMTP_PORT or 587,
        MAIL_SERVER=settings.SMTP_HOST or "smtp.gmail.com",
        MAIL_STARTTLS=True,
        MAIL_SSL_TLS=False,
        USE_CREDENTIALS=True,
        VALIDATE_CERTS=True,
        TIMEOUT=60
    )
    fast_mail = FastMail(conf)
except Exception as e:
    logger.error(f"Failed to initialize FastAPI-Mail config: {e}")
    conf = None
    fast_mail = None


async def send_email(to: str, subject: str, body: str) -> bool:
    if not conf or not fast_mail:
        raise ValueError("SMTP credentials not configured properly in environment.")
        
    print("SMTP HOST:", conf.MAIL_SERVER)
    print("SMTP USER:", conf.MAIL_USERNAME)
    
    message = MessageSchema(
        subject=subject,
        recipients=[to],
        body=body,
        subtype=MessageType.html
    )
    
    try:
        logger.info(f"Connecting to SMTP {conf.MAIL_SERVER}:{conf.MAIL_PORT} for {to}")
        await fast_mail.send_message(message)
        logger.info(f"Email sent successfully to {to}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to}: {type(e).__name__}: {e}")
        print("EMAIL ERROR:", str(e))
        traceback.print_exc()
        raise e


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


async def send_reset_password_email(email: str, token: str) -> bool:
    subject = "Reset Your Khayal Password"
    reset_link = f"https://khayal-ai.vercel.app/reset-password?token={token}"
    body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
        <h2 style="color: #22c55e;">Khayal Healthcare</h2>
        <p>You requested to reset your password. Click the button below to choose a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_link}" style="background-color: #22c55e; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Reset Password</a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #3b82f6;"><a href="{reset_link}">{reset_link}</a></p>
        <p><strong>This link expires in 15 minutes.</strong></p>
        <p style="color: #666; font-size: 12px; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
            If you didn't request a password reset, please ignore this email or contact support if you have concerns.
        </p>
    </body>
    </html>
    """
    return await send_email(email, subject, body)
