import os
from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.conf import settings
from users.models import User

class Command(BaseCommand):
    help = 'Kirim email pemberitahuan URL admin terbaru kepada Superadmin dan Support Agent'

    def handle(self, *args, **options):
        admin_url_path = os.environ.get('ADMIN_URL', 'admin/')
        if not admin_url_path.endswith('/'):
            admin_url_path += '/'
            
        domain = settings.TENANT_DOMAIN_SUFFIX
        protocol = 'https' if not settings.DEBUG else 'http'
        
        # Bersihkan format URL path
        admin_url_path = admin_url_path.lstrip('/')
        full_url = f"{protocol}://{domain}/{admin_url_path}"

        # Cari user dengan role SUPERADMIN atau SUPPORT_AGENT
        recipients = User.objects.filter(
            global_role__in=['SUPERADMIN', 'SUPPORT_AGENT'],
            is_active=True,
            receive_email_notifications=True
        ).values_list('email', flat=True)

        if not recipients:
            self.stdout.write(self.style.WARNING("Tidak ada penerima dengan role SUPERADMIN atau SUPPORT_AGENT."))
            return

        subject = f"[SECURITY] URL Portal Admin Baru - {domain}"
        message = (
            f"Halo,\n\n"
            f"Deployment terbaru telah berhasil diselesaikan.\n"
            f"Sebagai bentuk pengamanan, URL Portal Admin Anda telah diperbarui ke:\n\n"
            f"🔗 {full_url}\n\n"
            f"Harap simpan URL ini dengan aman. URL ini akan kembali berubah pada deployment berikutnya.\n\n"
            f"Salam,\n"
            f"Sistem Keamanan HariKerja HRMS"
        )

        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=list(recipients),
                fail_silently=False,
            )
            self.stdout.write(self.style.SUCCESS(f"Email sukses dikirim ke {len(recipients)} admin: {', '.join(recipients)}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Gagal mengirim email: {str(e)}"))
