import resend
from app.tasks.celery_app import celery_app
from app.config import settings

resend.api_key = settings.RESEND_API_KEY

# only send_email function will be changed if in case any new service platform is used other than resend.com
def send_email(to_email: str, subject: str, html_content: str):
    """Send email via Resend API (HTTPS — Render free tier compatible)"""
    try:
        resend.Emails.send({
            "from": "Pixel CRM <onboarding@resend.dev>",
            "to": to_email,
            "subject": subject,
            "html": html_content,
        })
        print(f"Email sent → {to_email}")
        return True
    except Exception as e:
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
            <a href="{settings.FRONTEND_URL}/login"
               style="background:#4F46E5;color:white;padding:12px 24px;
                      border-radius:6px;text-decoration:none;display:inline-block;margin-bottom:12px;">
               Access Your Dashboard
            </a>
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
            <br>
            <a href="{settings.FRONTEND_URL}/login"
               style="background:#4F46E5;color:white;padding:12px 24px;
                      border-radius:6px;text-decoration:none;display:inline-block;margin-bottom:12px;">
               Login to Pixel CRM
            </a>
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


# send reset email
@celery_app.task(name="app.tasks.email.send_reset_email")
def send_reset_email(email: str, first_name: str, reset_link: str):
    """Send password reset link email."""
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


# send grace email
@celery_app.task(name="app.tasks.email.send_grace_period_email")
def send_grace_period_email(
    email: str,
    first_name: str,
    company_name: str,
    grace_until: str,
    sub_end: str
):
    """Send grace period started notification email."""
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