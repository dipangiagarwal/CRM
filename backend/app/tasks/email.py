import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
from app.tasks.celery_app import celery_app
from app.config import settings


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


@celery_app.task(name="app.tasks.email.send_welcome_email")
def send_welcome_email(email: str, first_name: str, company_name: str):
    send_email(
        to_email=email,
        subject=f"Welcome to Pixel CRM — {company_name}!",
        html_content=f"""
            <h1>Welcome {first_name}! 🎉</h1>
            <p>Your CRM for <strong>{company_name}</strong> is ready.</p>
            <p>Login and start managing your contacts and deals.</p>
            <br>
            <p>Team Pixel CRM</p>
        """
    )


@celery_app.task(name="app.tasks.email.send_invite_email")
def send_invite_email(
    email: str,
    first_name: str,
    company_name: str,
    temp_password: str
):
    send_email(
        to_email=email,
        subject=f"You are invited to {company_name} CRM",
        html_content=f"""
            <h1>Hello {first_name}! 👋</h1>
            <p>You have been invited to join <strong>{company_name}</strong> on Pixel CRM.</p>
            <p><strong>Your login details:</strong></p>
            <p>Email: {email}</p>
            <p>Password: {temp_password}</p>
            <p>Please change your password after first login.</p>
            <br>
            <p>Team Pixel CRM</p>
        """
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
    send_email(
        to_email=email,
        subject=f"Payment Receipt — Pixel CRM {plan.title()} Plan",
        html_content=f"""
            <h1>Payment Successful! ✅</h1>
            <p>Hello {first_name},</p>
            <p>Your payment for <strong>{company_name}</strong> has been received.</p>
            <br>
            <p><strong>Plan:</strong> {plan.title()}</p>
            <p><strong>Amount:</strong> ₹{amount}</p>
            <p><strong>Valid Until:</strong> {sub_end}</p>
            <br>
            <p>Team Pixel CRM</p>
        """
    )


@celery_app.task(name="app.tasks.email.send_expiry_reminder")
def send_expiry_reminder(email: str, company_name: str, days_left: int):
    send_email(
        to_email=email,
        subject=f"Subscription expires in {days_left} day(s) — Pixel CRM",
        html_content=f"""
            <h1>Subscription Expiring Soon ⚠️</h1>
            <p>Your Pixel CRM subscription for <strong>{company_name}</strong>
            expires in <strong>{days_left} day(s)</strong>.</p>
            <p>Please renew to avoid interruption.</p>
            <br>
            <p>Team Pixel CRM</p>
        """
    )


@celery_app.task(name="app.tasks.email.send_reset_email")
def send_reset_email(email: str, first_name: str, reset_link: str):
    send_email(
        to_email=email,
        subject="Reset your Pixel CRM password",
        html_content=f"""
            <h1>Reset Password 🔐</h1>
            <p>Hello {first_name},</p>
            <p>Click below to reset your password:</p>
            <a href="{reset_link}" 
               style="background:#4F46E5;color:white;padding:12px 24px;
                      border-radius:6px;text-decoration:none;">
               Reset Password
            </a>
            <p>Link expires in 1 hour.</p>
            <p>If you didn't request this, ignore this email.</p>
            <br>
            <p>Team Pixel CRM</p>
        """
    )


@celery_app.task(name="app.tasks.email.send_grace_period_email")
def send_grace_period_email(
    email: str,
    first_name: str,
    company_name: str,
    grace_until: str,
    sub_end: str
):
    send_email(
        to_email=email,
        subject=f"Action Required — {company_name} subscription has expired",
        html_content=f"""
            <h1>Your Subscription Has Expired ⚠️</h1>
            <p>Hello {first_name},</p>
            <p>Your Pixel CRM subscription for <strong>{company_name}</strong> 
            has expired.</p>
            <br>
            <p><strong>Grace Period:</strong> You have until 
            <strong>{grace_until}</strong> to renew.</p>
            <br>
            <p style="background:#FEF3C7;padding:12px;border-radius:6px;">
            ⚠️ <strong>Important:</strong> Your new subscription period will 
            start from <strong>{sub_end}</strong> (the day your subscription 
            expired), not from the day of payment. You will not lose any days.
            </p>
            <br>
            <p>After <strong>{grace_until}</strong>, your account will be 
            suspended and you will lose access to all data.</p>
            <br>
            <p>Please renew immediately to avoid interruption.</p>
            <br>
            <p>Team Pixel CRM</p>
        """
    )