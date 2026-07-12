import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings

logger = logging.getLogger("transitops.email")


def smtp_configured() -> bool:
    return bool(settings.smtp_user and settings.smtp_password)


def send_otp_email(to_email: str, code: str, name: str = "") -> None:
    """Send a verification-code email via SMTP. Raises on failure."""
    greeting = f"Hello {name}," if name else "Hello,"
    subject = "TransitOps Security Code - Action Required"
    text_body = (
        f"{greeting}\n\n"
        "You requested a verification code to register on the TransitOps "
        "Smart Transport Operations Platform.\n\n"
        f"Your 6-digit verification code is: {code}\n\n"
        "This code expires in 5 minutes. If you did not request this code, "
        "please ignore this email."
    )
    html_body = f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;
                border:1px solid #e2e8f0;border-radius:12px">
      <h2 style="color:#4f46e5;margin-top:0">Transit<span style="color:#0f172a">Ops</span></h2>
      <p>{greeting}</p>
      <p>You requested a verification code to register on the TransitOps
         Smart Transport Operations Platform.</p>
      <div style="text-align:center;margin:24px 0">
        <span style="display:inline-block;background:#eef2ff;color:#4f46e5;font-size:28px;
                     font-weight:bold;letter-spacing:8px;padding:12px 24px;border-radius:8px">
          {code}
        </span>
      </div>
      <p style="color:#64748b;font-size:13px">This code expires in 5 minutes.
         If you did not request this code, please ignore this email.</p>
    </div>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_user}>"
    msg["To"] = to_email
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.smtp_user, [to_email], msg.as_string())
    logger.info("OTP email sent to %s", to_email)
