from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Payslip

@receiver(post_save, sender=Payslip)
def notify_employee_on_payslip_publish(sender, instance, created, **kwargs):
    """
    Triggers a notification to the employee when their payslip is created/published.
    """
    if not created:
        return

    from notifications.services import NotificationService
    service = NotificationService()
    service.notify_payslip_finalized(instance)
