from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings

@shared_task
def send_notification_email_task(email_address, title, message):
    """
    Sends an email representation of an in-app system notification.
    """
    if not email_address:
        return

    try:
        send_mail(
            subject=title,
            message=f"Halo,\n\n{message}\n\nTerima kasih,\nHRMS System",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email_address],
            fail_silently=False,
        )
    except Exception as e:
        # Log failure in production
        print(f"Failed to send notification email to {email_address}: {e}")
