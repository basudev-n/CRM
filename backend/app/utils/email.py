"""
Email utility using Resend API.
Provides functions to send OTP verification emails and other transactional emails.
"""

import resend
import logging
from app.config import settings

logger = logging.getLogger(__name__)


def _ensure_api_key():
    """Configure the Resend API key."""
    if not settings.RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set — emails will not be sent")
        return False
    resend.api_key = settings.RESEND_API_KEY
    return True


def send_otp_email(to_email: str, otp: str, purpose: str = "signup") -> bool:
    """
    Send an OTP verification email.
    Returns True if sent successfully, False otherwise.
    """
    if not _ensure_api_key():
        logger.info(f"[DEV MODE] OTP for {to_email}: {otp}")
        return False

    if purpose == "signup":
        subject = f"{otp} is your PropFlow verification code"
        heading = "Verify your email"
        message = "Use the code below to complete your PropFlow signup."
    else:
        subject = f"{otp} is your PropFlow login code"
        heading = "Your login code"
        message = "Use the code below to log in to PropFlow."

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
            <tr>
                <td align="center">
                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:460px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
                        <!-- Header -->
                        <tr>
                            <td style="padding:32px 32px 0;text-align:center;">
                                <h1 style="margin:0;font-size:22px;font-weight:600;color:#18181b;letter-spacing:-0.5px;">
                                    Prop<span style="font-weight:300;">Flow</span>
                                </h1>
                            </td>
                        </tr>
                        <!-- Body -->
                        <tr>
                            <td style="padding:32px;">
                                <h2 style="margin:0 0 8px;font-size:18px;font-weight:600;color:#18181b;">
                                    {heading}
                                </h2>
                                <p style="margin:0 0 24px;font-size:14px;color:#71717a;line-height:1.6;">
                                    {message}
                                </p>
                                <!-- OTP Code -->
                                <div style="background-color:#f4f4f5;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
                                    <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#18181b;font-family:'Courier New',monospace;">
                                        {otp}
                                    </span>
                                </div>
                                <p style="margin:0;font-size:13px;color:#a1a1aa;line-height:1.5;">
                                    This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.
                                </p>
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style="padding:0 32px 32px;text-align:center;">
                                <hr style="border:none;border-top:1px solid #e4e4e7;margin:0 0 16px;">
                                <p style="margin:0;font-size:12px;color:#a1a1aa;">
                                    &copy; PropFlow CRM &middot; Real Estate Management
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    try:
        params = {
            "from": f"PropFlow <{settings.FROM_EMAIL}>",
            "to": [to_email],
            "subject": subject,
            "html": html_body,
        }
        email = resend.Emails.send(params)
        logger.info(f"OTP email sent to {to_email}, id={email.get('id', 'unknown')}")
        return True
    except Exception as e:
        logger.error(f"Failed to send OTP email to {to_email}: {e}")
        return False


def send_invite_email(
    to_email: str,
    first_name: str,
    organisation_name: str,
    role: str,
    invite_token: str,
    inviter_name: str = "Your team",
) -> bool:
    """
    Send a team invitation email with a link to accept.
    Returns True if sent successfully, False otherwise.
    """
    if not _ensure_api_key():
        invite_url = f"{settings.FRONTEND_BASE_URL}/invite/{invite_token}"
        logger.info(f"[DEV MODE] Invite for {to_email}: {invite_url}")
        return False

    invite_url = f"{settings.FRONTEND_BASE_URL}/invite/{invite_token}"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
            <tr>
                <td align="center">
                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:460px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
                        <!-- Header -->
                        <tr>
                            <td style="padding:32px 32px 0;text-align:center;">
                                <h1 style="margin:0;font-size:22px;font-weight:600;color:#18181b;letter-spacing:-0.5px;">
                                    Prop<span style="font-weight:300;">Flow</span>
                                </h1>
                            </td>
                        </tr>
                        <!-- Body -->
                        <tr>
                            <td style="padding:32px;">
                                <h2 style="margin:0 0 8px;font-size:18px;font-weight:600;color:#18181b;">
                                    You're invited to join {organisation_name}
                                </h2>
                                <p style="margin:0 0 24px;font-size:14px;color:#71717a;line-height:1.6;">
                                    Hi {first_name}, {inviter_name} has invited you to join
                                    <strong>{organisation_name}</strong> on PropFlow as
                                    <strong style="text-transform:capitalize;">{role}</strong>.
                                </p>
                                <!-- CTA Button -->
                                <div style="text-align:center;margin-bottom:24px;">
                                    <a href="{invite_url}"
                                       style="display:inline-block;background-color:#18181b;color:#ffffff;font-size:14px;font-weight:600;
                                              text-decoration:none;padding:12px 32px;border-radius:9999px;">
                                        Accept Invitation
                                    </a>
                                </div>
                                <p style="margin:0 0 16px;font-size:13px;color:#a1a1aa;line-height:1.5;">
                                    Or copy and paste this link into your browser:
                                </p>
                                <div style="background-color:#f4f4f5;border-radius:8px;padding:12px;margin-bottom:24px;word-break:break-all;">
                                    <a href="{invite_url}" style="font-size:12px;color:#18181b;text-decoration:none;">
                                        {invite_url}
                                    </a>
                                </div>
                                <p style="margin:0;font-size:13px;color:#a1a1aa;line-height:1.5;">
                                    This invitation expires in 7 days. If you didn't expect this, you can safely ignore this email.
                                </p>
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style="padding:0 32px 32px;text-align:center;">
                                <hr style="border:none;border-top:1px solid #e4e4e7;margin:0 0 16px;">
                                <p style="margin:0;font-size:12px;color:#a1a1aa;">
                                    &copy; PropFlow CRM &middot; Real Estate Management
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    try:
        params = {
            "from": f"PropFlow <{settings.FROM_EMAIL}>",
            "to": [to_email],
            "subject": f"You're invited to join {organisation_name} on PropFlow",
            "html": html_body,
        }
        email = resend.Emails.send(params)
        logger.info(f"Invite email sent to {to_email}, id={email.get('id', 'unknown')}")
        return True
    except Exception as e:
        logger.error(f"Failed to send invite email to {to_email}: {e}")
        return False
