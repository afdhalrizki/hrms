from .models import SystemNotification
from django.utils import timezone
from django.conf import settings
from users.models import User
from .tasks import send_notification_email_task
class NotificationService:
    """
    Centralized service for sending notifications.
    Separates Admin (System/Billing) from Operational (Employee/Workflow) alerts.
    """

    def send_admin_notification(self, title, message, level='INFO', expires_at=None):
        """
        Sends a notification to all administrators (target_user is None).
        Category is set to 'ADMIN'.
        """
        return self._create(
            title=title,
            message=message,
            level=level,
            category='ADMIN',
            expires_at=expires_at
        )

    def send_employee_notification(self, target_user, title, message, level='INFO', expires_at=None):
        """
        Sends a notification to a specific employee/user.
        Category is set to 'OPERATIONAL'.
        """
        # Trigger async email notification if enabled globally and by the user
        if getattr(settings, 'ENABLE_EMAIL_NOTIFICATIONS', True):
            if target_user and getattr(target_user, 'email', None):
                if getattr(target_user, 'receive_email_notifications', True):
                    send_notification_email_task.delay(target_user.email, title, message)

        return self._create(
            title=title,
            message=message,
            level=level,
            category='OPERATIONAL',
            target_user=target_user,
            expires_at=expires_at
        )

    # --- Specialized Triggers ---

    def notify_workflow_status_change(self, instance, actor, action):
        """
        Notifies the employee who submitted the request about its final status.
        """
        employee = getattr(instance, 'employee', None)
        if not employee:
            return None
        
        try:
            target_user = User.objects.get(email=employee.email)
        except User.DoesNotExist:
            return None

        status_map = {
            'APPROVED': ('Success', 'SUCCESS'),
            'REJECTED': ('Ditolak', 'CRITICAL'),
            'RETURNED': ('Dikembalikan', 'WARNING'),
        }
        status_label, level = status_map.get(action, (action.capitalize(), 'INFO'))
        
        title = f"Status Pengajuan: {status_label}"
        message = f"Pengajuan {instance.__class__.__name__} Anda untuk tanggal {getattr(instance, 'date', getattr(instance, 'start_date', ''))} telah {status_label} oleh {actor.fullname if actor else 'System'}."
        
        return self.send_employee_notification(target_user, title, message, level=level)

    def notify_pending_approval(self, instance, approver_employee):
        """
        Notifies a manager/approver about a pending request.
        """
        if not approver_employee:
            return None
            
        try:
            target_user = User.objects.get(email=approver_employee.email)
        except User.DoesNotExist:
            return None

        title = "Persetujuan Diperlukan"
        message = f"{instance.employee.fullname} mengajukan {instance.__class__.__name__}. Mohon tinjau untuk persetujuan."
        
        return self.send_employee_notification(target_user, title, message, level='WARNING')

    def notify_payment_status(self, invoice, success=True):
        """
        Notifies admins about the status of a Midtrans payment.
        """
        if success:
            title = "Pembayaran Berhasil"
            message = f"Pembayaran Invoice #{invoice.midtrans_order_id} sebesar Rp {invoice.amount:,} telah berhasil diterima."
            level = 'SUCCESS'
        else:
            title = "Pembayaran Gagal"
            message = f"Pembayaran Invoice #{invoice.midtrans_order_id} gagal atau telah kadaluarsa."
            level = 'CRITICAL'
        
        return self.send_admin_notification(title, message, level=level)

    def notify_quota_warning(self, current_count, capacity, level='WARNING'):
        """
        Sends a quota warning to administrators.
        """
        title = "Peringatan Kuota Karyawan"
        message = f"Penggunaan kuota karyawan Anda mencapai {current_count}/{capacity} ({int(current_count/capacity*100)}%)."
        
        return self.send_admin_notification(title, message, level=level)

    def notify_storage_warning(self, current_bytes, limit_mb, level='WARNING'):
        """
        Sends a storage usage warning to administrators.
        """
        limit_bytes = limit_mb * 1024 * 1024
        usage_percent = int((current_bytes / limit_bytes) * 100)
        
        title = "Peringatan Penyimpanan"
        message = f"Penggunaan ruang penyimpanan Anda mencapai {usage_percent}%. Kapasitas: {limit_mb}MB."
        
        return self.send_admin_notification(title, message, level=level)

    def notify_payslip_finalized(self, payslip):
        """
        Notifies an employee when their payslip is published.
        """
        try:
            target_user = User.objects.get(email=payslip.employee.email)
        except User.DoesNotExist:
            return None

        title = "Slip Gaji Terbit"
        message = f"Slip gaji Anda untuk periode {payslip.period.month}/{payslip.period.year} sudah tersedia. Silakan cek di menu Payroll."
        
        return self.send_employee_notification(target_user, title, message, level='SUCCESS')

    def notify_employee_onboarding(self, employee, domain_name):
        """
        Triggers the onboarding email for a newly created employee.
        """
        if not employee or not employee.email:
            return None
            
        # Create in-app notification
        title = "Selamat Datang!"
        message = f"Selamat bergabung di perusahaan. Akun Anda telah aktif di {domain_name}."
        
        # Trigger actual email task
        from .tasks import send_employee_onboarding_email_task
        send_employee_onboarding_email_task.delay(employee.email, employee.fullname, domain_name)
        
        try:
            target_user = User.objects.get(email=employee.email)
            return self.send_employee_notification(target_user, title, message, level='SUCCESS')
        except User.DoesNotExist:
            # If user record isn't created yet, we just send the email
            return None

    def _create(self, title, message, level, category, target_user=None, expires_at=None):
        """Internal helper to create SystemNotification records."""
        return SystemNotification.objects.create(
            title=title,
            message=message,
            level=level,
            category=category,
            target_user=target_user,
            expires_at=expires_at
        )
