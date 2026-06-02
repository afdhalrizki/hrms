from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings

@shared_task
def send_registration_email_task(admin_email, company_name=None, subdomain_prefix=None):
    """
    Sends a confirmation email when a tenant registers.
    """
    try:
        # 1. Send confirmation to the registrant
        send_mail(
            subject='Registration Received',
            message='Pendaftaran Anda telah kami terima dan akan segera kami tinjau.\n\nTerima kasih,\nHariKerja HRMS',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[admin_email],
            fail_silently=False,
        )

        # 2. Send notification to platform admins or custom emails
        if company_name and subdomain_prefix:
            domain_suffix = getattr(settings, 'TENANT_DOMAIN_SUFFIX', 'localhost')
            desired_url = f"https://{subdomain_prefix}.{domain_suffix}"
            
            from tenants.models import GlobalSetting
            from users.models import User
            
            recipients = []
            try:
                setting = GlobalSetting.objects.filter(key='registration_notification_emails').first()
                if setting and setting.value:
                    recipients = [e.strip() for e in setting.value.split(',') if e.strip()]
            except Exception as se:
                print(f"Error retrieving global settings: {se}")
                
            # Fallback to default (global admins) if no dynamic emails are set
            if not recipients:
                recipients = list(User.objects.filter(
                    global_role__in=['SUPERADMIN', 'ONBOARDING_AGENT'],
                    is_active=True
                ).values_list('email', flat=True))
                
            if recipients:
                admin_subject = f'[Notifikasi Registrasi] Tenant Baru: {company_name}'
                admin_message = (
                    f"Halo,\n\n"
                    f"Terdapat pendaftaran user/tenant baru di platform HariKerja HRMS dengan rincian berikut:\n\n"
                    f"- Nama Tenant: {company_name}\n"
                    f"- Subdomain: {subdomain_prefix}\n"
                    f"- URL yang Diinginkan: {desired_url}\n"
                    f"- Email Admin: {admin_email}\n\n"
                    f"Silakan masuk ke platform admin internal untuk meninjau dan memberikan persetujuan.\n\n"
                    f"Terima kasih,\nHariKerja HRMS"
                )
                
                send_mail(
                    subject=admin_subject,
                    message=admin_message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=recipients,
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
            message=f'Workspace Anda {domain_name} sudah siap.\n\nSekarang Anda dapat login menggunakan email: {admin_email}\nPassword: change-me-123\n\nMohon segera ubah password Anda setelah login.\n\nTerima kasih,\nHariKerja HRMS',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[admin_email],
            fail_silently=False,
        )
    except Exception as e:
        print(f"Failed to send welcome email to {admin_email}: {e}")
