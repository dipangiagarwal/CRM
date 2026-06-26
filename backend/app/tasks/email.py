import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
from app.tasks.celery_app import celery_app
from app.config import settings
from datetime import datetime


def send_email(to_email: str, subject: str, html_content: str):
    """Send email via Brevo API (HTTPS, port 443 — works on Render free tier)."""
    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key['api-key'] = settings.BREVO_API_KEY

    api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
        sib_api_v3_sdk.ApiClient(configuration)
    )

    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        to=[{"email": to_email}],
        sender={"email": settings.FROM_EMAIL, "name": "Pixel CRM"},
        subject=subject,
        html_content=html_content
    )

    try:
        api_instance.send_transac_email(send_smtp_email)
        print(f"Email sent → {to_email}")
        return True
    except ApiException as e:
        print(f"Email failed → {to_email}: {str(e)}")
        return False


def get_html_wrapper(title: str, content: str, button_text: str = None, button_url: str = None) -> str:
    """Wrap standard email body content into a premium, responsive HTML template."""
    current_year = datetime.now().year
    
    button_html = ""
    if button_text and button_url:
        button_html = f"""
        <div style="margin: 32px 0 20px 0; text-align: center;">
            <a href="{button_url}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); color: #ffffff; font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25); text-align: center; letter-spacing: 0.3px;">
                {button_text}
            </a>
        </div>
        """
        
    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@600;700&display=swap');
        body {{
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f8fafc;
            color: #334155;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
        }}
    </style>
</head>
<body style="background-color: #f8fafc; margin: 0; padding: 40px 20px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 30px; text-align: center; border-bottom: 4px solid #4f46e5;">
            <span style="font-family: 'Outfit', sans-serif; font-size: 26px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                <span style="color: #6366f1;">Pixel</span> CRM
            </span>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 35px; line-height: 1.6; color: #334155; font-size: 15px;">
            {content}
            {button_html}
        </div>
        
        <!-- Footer -->
        <div style="padding: 24px 35px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; color: #64748b; font-size: 13px;">
            <p style="margin: 0 0 6px 0; font-weight: 600; color: #475569;">Pixel CRM Team</p>
            <p style="margin: 0;">&copy; {current_year} Pixel CRM. All rights reserved.</p>
        </div>
    </div>
</body>
</html>"""


@celery_app.task(name="app.tasks.email.send_welcome_email")
def send_welcome_email(email: str, first_name: str, company_name: str):
    login_url = f"{settings.FRONTEND_URL.rstrip('/')}/login"
    content = f"""
        <h2 style="font-family: 'Outfit', sans-serif; color: #0f172a; margin-top: 0; font-size: 22px;">Welcome {first_name}! 🎉</h2>
        <p>Your Pixel CRM workspace for <strong>{company_name}</strong> is ready to use.</p>
        <p>Login now to start managing your contacts, tracking deals, assigning leads, and growing your business.</p>
    """
    html_content = get_html_wrapper(
        title=f"Welcome to Pixel CRM — {company_name}!",
        content=content,
        button_text="Get Started",
        button_url=login_url
    )
    send_email(
        to_email=email,
        subject=f"Welcome to Pixel CRM — {company_name}!",
        html_content=html_content
    )


@celery_app.task(name="app.tasks.email.send_invite_email")
def send_invite_email(
    email: str,
    first_name: str,
    company_name: str,
    temp_password: str
):
    login_url = f"{settings.FRONTEND_URL.rstrip('/')}/login"
    content = f"""
        <h2 style="font-family: 'Outfit', sans-serif; color: #0f172a; margin-top: 0; font-size: 22px;">Hello {first_name}! 👋</h2>
        <p>You have been invited to join the <strong>{company_name}</strong> workspace on Pixel CRM.</p>
        <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #0f172a;">Your Temporary Credentials:</p>
            <p style="margin: 0 0 4px 0;"><strong>Email:</strong> {email}</p>
            <p style="margin: 0;"><strong>Password:</strong> {temp_password}</p>
        </div>
        <p style="color: #64748b; font-size: 14px;">Please change your password after logging in for the first time.</p>
    """
    html_content = get_html_wrapper(
        title=f"You are invited to {company_name} CRM",
        content=content,
        button_text="Login to CRM",
        button_url=login_url
    )
    send_email(
        to_email=email,
        subject=f"You are invited to {company_name} CRM",
        html_content=html_content
    )


@celery_app.task(name="app.tasks.email.send_payment_receipt")
def send_payment_receipt(
    email: str,
    first_name: str,
    company_name: str,
    amount: float,
    plan: str,
    sub_end: str
):
    billing_url = f"{settings.FRONTEND_URL.rstrip('/')}/billing"
    content = f"""
        <h2 style="font-family: 'Outfit', sans-serif; color: #10b981; margin-top: 0; font-size: 22px;">Payment Successful! ✅</h2>
        <p>Hello {first_name},</p>
        <p>Your payment for <strong>{company_name}</strong> has been received and processed successfully.</p>
        <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #0f172a;">Subscription Details:</p>
            <p style="margin: 0 0 4px 0;"><strong>Plan:</strong> {plan.title()}</p>
            <p style="margin: 0 0 4px 0;"><strong>Amount Paid:</strong> ₹{amount}</p>
            <p style="margin: 0;"><strong>Valid Until:</strong> {sub_end}</p>
        </div>
    """
    html_content = get_html_wrapper(
        title=f"Payment Receipt — Pixel CRM {plan.title()} Plan",
        content=content,
        button_text="View Billing Settings",
        button_url=billing_url
    )
    send_email(
        to_email=email,
        subject=f"Payment Receipt — Pixel CRM {plan.title()} Plan",
        html_content=html_content
    )


@celery_app.task(name="app.tasks.email.send_expiry_reminder")
def send_expiry_reminder(email: str, company_name: str, days_left: int):
    billing_url = f"{settings.FRONTEND_URL.rstrip('/')}/billing"
    content = f"""
        <h2 style="font-family: 'Outfit', sans-serif; color: #f59e0b; margin-top: 0; font-size: 22px;">Subscription Expiring Soon ⚠️</h2>
        <p>Your Pixel CRM subscription for <strong>{company_name}</strong> expires in <strong>{days_left} day(s)</strong>.</p>
        <p>To avoid any interruption to your workflows and loss of access, please renew your subscription now.</p>
    """
    html_content = get_html_wrapper(
        title=f"Subscription expires in {days_left} day(s) — Pixel CRM",
        content=content,
        button_text="Renew Subscription",
        button_url=billing_url
    )
    send_email(
        to_email=email,
        subject=f"Subscription expires in {days_left} day(s) — Pixel CRM",
        html_content=html_content
    )


@celery_app.task(name="app.tasks.email.send_reset_email")
def send_reset_email(email: str, first_name: str, reset_link: str):
    content = f"""
        <h2 style="font-family: 'Outfit', sans-serif; color: #0f172a; margin-top: 0; font-size: 22px;">Reset Password 🔐</h2>
        <p>Hello {first_name},</p>
        <p>We received a request to reset your Pixel CRM password. Click the button below to choose a new password:</p>
        <p style="color: #ef4444; font-size: 14px; font-weight: 500; margin: 15px 0 0 0;">⚠️ This link expires in 1 hour.</p>
        <p style="color: #64748b; font-size: 13px;">If you didn't request a password reset, you can safely ignore this email.</p>
    """
    html_content = get_html_wrapper(
        title="Reset your Pixel CRM password",
        content=content,
        button_text="Reset Password",
        button_url=reset_link
    )
    send_email(
        to_email=email,
        subject="Reset your Pixel CRM password",
        html_content=html_content
    )


@celery_app.task(name="app.tasks.email.send_grace_period_email")
def send_grace_period_email(
    email: str,
    first_name: str,
    company_name: str,
    grace_until: str,
    sub_end: str
):
    billing_url = f"{settings.FRONTEND_URL.rstrip('/')}/billing"
    content = f"""
        <h2 style="font-family: 'Outfit', sans-serif; color: #ef4444; margin-top: 0; font-size: 22px;">Your Subscription Has Expired ⚠️</h2>
        <p>Hello {first_name},</p>
        <p>Your Pixel CRM subscription for <strong>{company_name}</strong> has expired.</p>
        <div style="background-color: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fef3c7; color: #b45309;">
            <p style="margin: 0 0 8px 0; font-weight: 700;">⚠️ Action Required — Grace Period Active</p>
            <p style="margin: 0 0 6px 0;">You have until <strong>{grace_until}</strong> to renew.</p>
            <p style="margin: 0; font-size: 14px; line-height: 1.5;"><strong>Important:</strong> Your new subscription period will start from {sub_end} (the day of expiration), so you won't lose any active billing days.</p>
        </div>
        <p>After <strong>{grace_until}</strong>, your account will be suspended and you will lose access to all data.</p>
    """
    html_content = get_html_wrapper(
        title=f"Action Required — {company_name} subscription has expired",
        content=content,
        button_text="Renew Subscription Now",
        button_url=billing_url
    )
    send_email(
        to_email=email,
        subject=f"Action Required — {company_name} subscription has expired",
        html_content=html_content
    )