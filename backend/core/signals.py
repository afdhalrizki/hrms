from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db import connection
from .models import Employee
from reimbursement.models import Reimbursement

@receiver(post_save, sender=Employee)
@receiver(post_save, sender=Reimbursement)
def update_storage_on_save(sender, instance, created, **kwargs):
    """
    Updates the tenant's storage_used_bytes when a model with files is saved.
    This is a simplified version; in production, you'd calculate actual file sizes.
    """
    tenant = connection.tenant
    if not tenant:
        return

    total_bytes = 0
    
    # Sum up all employees face references
    for emp in Employee.objects.exclude(face_reference=''):
        if emp.face_reference:
            total_bytes += emp.face_reference.size

    # Sum up all reimbursement receipts
    for rem in Reimbursement.objects.exclude(attachment=''):
        if rem.attachment:
            total_bytes += rem.attachment.size

    if tenant and hasattr(tenant, 'save'):
        tenant.storage_used_bytes = total_bytes
        tenant.save(update_fields=['storage_used_bytes'])

@receiver(post_save, sender=Employee)
def deactivate_user_on_termination(sender, instance, **kwargs):
    """
    Deactivates the associated user when an employee is terminated.
    """
    if instance.status == 'TERMINATED' and instance.user:
        instance.user.is_active = False
        instance.user.save(update_fields=['is_active'])

@receiver(post_delete, sender=Employee)
@receiver(post_delete, sender=Reimbursement)
def update_storage_on_delete(sender, instance, **kwargs):
    update_storage_on_save(sender, instance, created=False)
