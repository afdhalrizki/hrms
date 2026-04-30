from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings

@shared_task
def send_registration_email_task(admin_email):
    """
    Sends a confirmation email when a tenant registers.
    """
    try:
        send_mail(
            subject='Registration Received',
            message='We have received your registration request and our admin will review it shortly.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[admin_email],
            fail_silently=False,
        )
    except Exception as e:
        # In production, logging should be used here
        print(f"Failed to send registration email to {admin_email}: {e}")


@shared_task
def send_welcome_email_task(admin_email, domain_name):
    """
    Sends a welcome email with credentials once the tenant is approved.
    """
    try:
        send_mail(
            subject='Welcome to HRMS',
            message=f'Your workspace {domain_name} is ready.\n\nYou can now log in using your email: {admin_email}\nPassword: change-me-123\n\nPlease change your password immediately after logging in.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[admin_email],
            fail_silently=False,
        )
    except Exception as e:
        print(f"Failed to send welcome email to {admin_email}: {e}")
