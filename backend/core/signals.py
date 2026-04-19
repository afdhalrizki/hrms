from django.core.exceptions import ValidationError
from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.db import connection, transaction
from django.db.models import F
from django_tenants.signals import post_schema_sync
from django_tenants.utils import schema_context
from .models import Employee, AccessRole
from . import constants
from .storage_utils import get_instance_file_size
from reimbursement.models import Reimbursement
from attendance.models import Attendance, LeaveRequest
from tenants.models import Tenant

@receiver(post_schema_sync)
def initialize_tenant_roles(sender, tenant, **kwargs):
    """
    Automatically creates the default RBAC roles whenever a new tenant schema 
    is synchronized. This ensures every tenant starts with 3 foundational roles.
    """
    if tenant.schema_name == 'public':
        return

    with schema_context(tenant.schema_name):
        from core.services import RoleService
        RoleService.initialize_default_roles()

@receiver(pre_save, sender=Attendance)
@receiver(pre_save, sender=LeaveRequest)
@receiver(pre_save, sender=Employee)
@receiver(pre_save, sender=Reimbursement)
def capture_old_file_size(sender, instance, **kwargs):
    """
    Captures the file size of the existing instance before it is saved.
    Also handles employee quota enforcement.
    """
    tenant = connection.tenant
    
    # 1. Employee Quota Enforcement
    if sender == Employee and not instance.pk:
        if tenant and tenant.schema_name != 'public':
            tenant_pk = getattr(tenant, 'pk', None)
            if not tenant_pk:
                real_tenant = Tenant.objects.get(schema_name=tenant.schema_name)
            else:
                real_tenant = tenant
            
            if real_tenant.employee_count >= real_tenant.total_employee_capacity:
                raise ValidationError(
                    f"Employee quota exceeded ({real_tenant.employee_count}/{real_tenant.total_employee_capacity}). "
                    "Cannot add more employees. Please upgrade your plan."
                )

    # 2. File Size Capture
    if instance.pk:
        try:
            # We fetch a fresh copy from DB to get the old file state
            # Using .only() to minimize DB load
            old_instance = sender.objects.only('pk').get(pk=instance.pk)
            instance._old_storage_size = get_instance_file_size(old_instance)
        except sender.DoesNotExist:
            instance._old_storage_size = 0
    else:
        # New instance, old size is 0
        instance._old_storage_size = 0

    # Quota Enforcement: Prevent saving if total storage would be exceeded
    tenant = connection.tenant
    if tenant and tenant.schema_name != 'public':
        new_size = get_instance_file_size(instance)
        old_size = getattr(instance, '_old_storage_size', 0)
        diff = new_size - old_size
        
        if diff > 0:
            tenant_pk = getattr(tenant, 'pk', None)
            if not tenant_pk:
                real_tenant = Tenant.objects.get(schema_name=tenant.schema_name)
            else:
                real_tenant = tenant

            current_total = real_tenant.storage_used_bytes
            limit_bytes = real_tenant.total_storage_capacity_bytes
            
            if current_total + diff > limit_bytes:
                raise ValidationError(
                    f"Storage quota exceeded. Cannot upload {diff} bytes. "
                    f"Current usage: {current_total} bytes, Total limit: {limit_bytes} bytes. "
                    "Please upgrade your plan or purchase a storage add-on."
                )

@receiver(post_save, sender=Attendance)
@receiver(post_save, sender=LeaveRequest)
@receiver(post_save, sender=Employee)
@receiver(post_save, sender=Reimbursement)
def update_storage_incremental(sender, instance, created, **kwargs):
    """
    Updates the tenant's storage_used_bytes incrementally using the delta 
    between new and old file sizes.
    """
    tenant = connection.tenant
    if not tenant or tenant.schema_name == 'public':
        return

    new_size = get_instance_file_size(instance)
    old_size = getattr(instance, '_old_storage_size', 0)
    diff = new_size - old_size

    if diff != 0:
        # Use atomic update on the model class to prevent race conditions 
        # and avoid issues with FakeTenant objects in some contexts.
        tenant_pk = getattr(tenant, 'pk', None)
        if not tenant_pk:
            tenant_pk = Tenant.objects.get(schema_name=tenant.schema_name).pk

        Tenant.objects.filter(pk=tenant_pk).update(
            storage_used_bytes=F('storage_used_bytes') + diff
        )
        
        # Get fresh data for notification logic
        updated_tenant = Tenant.objects.get(pk=tenant_pk)
        
        # Storage Quota Alerts
        limit_mb = getattr(updated_tenant, 'total_storage_capacity_mb', 0)
        if limit_mb > 0:
            total_bytes = updated_tenant.storage_used_bytes
            limit_bytes = limit_mb * 1024 * 1024
            usage_percent = (total_bytes / limit_bytes) * 100
            
            from notifications.services import NotificationService
            service = NotificationService()
            
            if total_bytes >= limit_bytes:
                service.notify_storage_warning(total_bytes, limit_mb, level='CRITICAL')
            elif usage_percent >= 90:
                service.notify_storage_warning(total_bytes, limit_mb, level='WARNING')

@receiver(post_save, sender=Employee)
def deactivate_user_on_termination(sender, instance, **kwargs):
    """
    Deactivates the associated user when an employee is terminated.
    """
    if instance.status == 'TERMINATED' and instance.user:
        instance.user.is_active = False
        instance.user.save(update_fields=['is_active'])

        # Notify Admins about the deactivation
        from notifications.services import NotificationService
        service = NotificationService()
        service.send_admin_notification(
            title="Akun User Dinonaktifkan",
            message=f"Akun user {instance.user.email} telah dinonaktifkan secara otomatis karena status karyawan {instance.fullname} berubah menjadi TERTERMINASI.",
            level='WARNING'
        )

@receiver(post_save, sender=Employee)
def assign_default_role_to_employee(sender, instance, created, **kwargs):
    """
    Ensures every new employee has at least the 'Staff' (self-service) role.
    """
    if created and not instance.access_role:
        try:
            staff_role = AccessRole.objects.get(name="Staff")
            instance.access_role = staff_role
            instance.save(update_fields=['access_role'])
        except AccessRole.DoesNotExist:
            # Should be created by post_schema_sync, but safety first
            pass

@receiver(post_save, sender=Employee)
def update_employee_count_incremental(sender, instance, created, **kwargs):
    """
    Increments the tenant's employee_count when a new employee is created.
    """
    if not created:
        return

    tenant = connection.tenant
    if not tenant:
        return

    if not created:
        return

    # Use atomic update to prevent race conditions. 
    # Handle FakeTenant by falling back to schema_name lookup if pk is missing.
    tenant_pk = getattr(tenant, 'pk', None)
    if not tenant_pk:
        tenant_pk = Tenant.objects.get(schema_name=tenant.schema_name).pk

    Tenant.objects.filter(pk=tenant_pk).update(employee_count=F('employee_count') + 1)
    
    # Check quota and alert
    updated_tenant = Tenant.objects.get(pk=tenant_pk)
    current_count = updated_tenant.employee_count
    capacity = updated_tenant.total_employee_capacity
    
    if capacity > 0:
        usage_percent = (current_count / capacity) * 100
        from notifications.services import NotificationService
        service = NotificationService()

        if current_count >= capacity:
            service.notify_quota_warning(current_count, capacity, level='CRITICAL')
        elif usage_percent >= 90:
            service.notify_quota_warning(current_count, capacity, level='WARNING')

@receiver(post_delete, sender=Employee)
def update_employee_count_on_delete(sender, instance, **kwargs):
    """
    Decrements the tenant's employee_count when an employee is deleted.
    """
    tenant = connection.tenant
    if not tenant or tenant.schema_name == 'public':
        return

    tenant_pk = getattr(tenant, 'pk', None)
    if not tenant_pk:
        tenant_pk = Tenant.objects.get(schema_name=tenant.schema_name).pk

    from django.db.models.functions import Greatest
    Tenant.objects.filter(pk=tenant_pk).update(
        employee_count=Greatest(0, F('employee_count') - 1)
    )


@receiver(post_delete, sender=Employee)
@receiver(post_delete, sender=Reimbursement)
@receiver(post_delete, sender=Attendance)
@receiver(post_delete, sender=LeaveRequest)
def update_storage_on_delete(sender, instance, **kwargs):
    """
    Subtracts the instance's file sizes from the tenant's storage_used_bytes 
    when a record is deleted.
    """
    tenant = connection.tenant
    if not tenant or tenant.schema_name == 'public':
        return

    size_to_remove = get_instance_file_size(instance)
    if size_to_remove > 0:
        tenant_pk = getattr(tenant, 'pk', None)
        if not tenant_pk:
            tenant_pk = Tenant.objects.get(schema_name=tenant.schema_name).pk

        Tenant.objects.filter(pk=tenant_pk).update(
            storage_used_bytes=F('storage_used_bytes') - size_to_remove
        )
