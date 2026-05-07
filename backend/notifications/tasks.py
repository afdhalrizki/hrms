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
            message=f"Halo,\n\n{message}\n\nTerima kasih,\nHariKerja HRMS",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email_address],
            fail_silently=False,
        )
    except Exception as e:
        # Log failure in production
        print(f"Failed to send notification email to {email_address}: {e}")


@shared_task
def send_employee_onboarding_email_task(email_address, fullname, domain_name):
    """
    Sends a welcome email to a newly created employee with login instructions.
    """
    try:
        send_mail(
            subject='Selamat Datang di HariKerja HRMS',
            message=f"Halo {fullname},\n\nSelamat bergabung! Akun HRMS Anda telah berhasil dibuat.\n\nAnda dapat login ke workspace perusahaan di:\nhttps://{domain_name}\n\nGunakan email ini untuk login.\nJika Anda belum memiliki password, silakan hubungi admin atau gunakan fitur 'Lupa Password'.\n\nTerima kasih,\nHariKerja HRMS",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email_address],
            fail_silently=False,
        )
    except Exception as e:
        print(f"Failed to send onboarding email to {email_address}: {e}")
