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
    Also handles employee quota enforcement and captures status changes.
    """
    tenant = connection.tenant
    
    # 1. Employee Quota Enforcement (only for new active employees)
    if sender == Employee and not instance.pk:
        if instance.status != 'TERMINATED':
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

    # 2. File Size Capture and original status capture
    if instance.pk:
        if sender == Employee:
            try:
                original_emp = Employee.objects.get(pk=instance.pk)
                instance._original_status = original_emp.status
            except Employee.DoesNotExist:
                instance._original_status = None

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
    Deactivates the associated user when an employee is terminated or resigned.
    """
    user = instance.user
    if instance.status in ['TERMINATED', 'RESIGNED'] and user:
        # Prevent deactivating user if they are not associated with the current tenant schema
        if not user.tenants.filter(schema_name=connection.schema_name).exists():
            return
            
        user.is_active = False
        from django_tenants.utils import schema_context
        with schema_context('public'):
            user.save(update_fields=['is_active'])

        # Notify Admins about the deactivation
        from notifications.services import NotificationService
        service = NotificationService()
        status_label = "TERTERMINASI" if instance.status == 'TERMINATED' else "MENGUNDURKAN DIRI"
        service.send_admin_notification(
            title="Akun User Dinonaktifkan",
            message=f"Akun user {user.email} telah dinonaktifkan secara otomatis karena status karyawan {instance.fullname} berubah menjadi {status_label}.",
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
    Increments the tenant's employee_count when a new active employee is created,
    or adjusts it when an employee's status changes to/from TERMINATED or RESIGNED.
    """
    tenant = connection.tenant
    if not tenant or tenant.schema_name == 'public':
        return

    tenant_pk = getattr(tenant, 'pk', None)
    if not tenant_pk:
        tenant_pk = Tenant.objects.get(schema_name=tenant.schema_name).pk

    inactive_statuses = ['TERMINATED', 'RESIGNED']

    if created:
        # Only increment if the new employee is active (not TERMINATED or RESIGNED)
        if instance.status not in inactive_statuses:
            Tenant.objects.filter(pk=tenant_pk).update(employee_count=F('employee_count') + 1)
    else:
        # It's an update. Check if the status changed!
        original_status = getattr(instance, '_original_status', None)
        current_status = instance.status

        if original_status and original_status != current_status:
            # 1. Changed from Active to Inactive (release a seat)
            if original_status not in inactive_statuses and current_status in inactive_statuses:
                from django.db.models.functions import Greatest
                Tenant.objects.filter(pk=tenant_pk).update(
                    employee_count=Greatest(0, F('employee_count') - 1)
                )
            # 2. Changed from Inactive to Active (occupy a seat)
            elif original_status in inactive_statuses and current_status not in inactive_statuses:
                # Check quota first!
                updated_tenant = Tenant.objects.get(pk=tenant_pk)
                if updated_tenant.employee_count >= updated_tenant.total_employee_capacity:
                    # Note: We are already in post_save, so raising ValidationError here will rollback the transaction,
                    # which is perfect to prevent exceeding the quota on rehire!
                    raise ValidationError(
                        f"Cannot reactivate employee. Employee quota exceeded ({updated_tenant.employee_count}/{updated_tenant.total_employee_capacity})."
                    )
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
    Decrements the tenant's employee_count when an active employee is deleted.
    """
    if instance.status == 'TERMINATED':
        return

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


@receiver(pre_save, sender=Employee)
def sync_employee_email_to_user(sender, instance, **kwargs):
    """
    Synchronizes email changes from Employee (tenant schema) to the associated User account (public schema).
    """
    if not instance.pk:
        return

    try:
        original = Employee.objects.get(pk=instance.pk)
    except Employee.DoesNotExist:
        return

    if original.email.lower().strip() != instance.email.lower().strip():
        from users.models import User
        new_email = instance.email.lower().strip()
        old_email = original.email.lower().strip()

        with schema_context('public'):
            # Check if the new email is already used by another user
            if User.objects.filter(email=new_email).exclude(email=old_email).exists():
                raise ValidationError("Email ini sudah digunakan oleh akun User lain.")
            
            # Perform atomic update on User
            User.objects.filter(email=old_email).update(email=new_email)


@receiver(pre_save, sender='users.User')
def sync_user_email_to_employee(sender, instance, **kwargs):
    """
    Synchronizes email changes from User account (public schema) to all associated Employees across their tenants.
    """
    if not instance.pk:
        return

    from users.models import User
    try:
        original = User.objects.get(pk=instance.pk)
    except User.DoesNotExist:
        return

    if original.email.lower().strip() != instance.email.lower().strip():
        new_email = instance.email.lower().strip()
        old_email = original.email.lower().strip()

        # User is in public schema, we get its tenants
        with schema_context('public'):
            tenants = list(instance.tenants.all())
            
        for tenant in tenants:
            with schema_context(tenant.schema_name):
                # Check if the new email is already used by another employee in this tenant
                if Employee.objects.filter(email=new_email).exclude(email=old_email).exists():
                    raise ValidationError(
                        f"Email ini sudah digunakan oleh Karyawan lain di penyewa '{tenant.name}'."
                    )
                
                # Perform update
                Employee.objects.filter(email=old_email).update(email=new_email)


@receiver(pre_save, sender=Employee)
def prevent_duplicate_active_cross_tenant(sender, instance, **kwargs):
    """
    Prevents adding or updating an employee's email if they are already active (not TERMINATED)
    in another tenant.
    """
    if not instance.email:
        return

    # Normalize email
    email = instance.email.lower().strip()
    
    # We only care about active employees being created/updated as active
    if instance.status == 'TERMINATED':
        return
        
    tenant = connection.tenant
    if not tenant or tenant.schema_name == 'public':
        return

    from tenants.models import Tenant
    # 1. Fetch other tenants from the public schema
    with schema_context('public'):
        other_tenants = list(Tenant.objects.exclude(schema_name='public').exclude(schema_name=tenant.schema_name))
        
    # 2. Check each other tenant schema for an active employee with the same email
    for other_tenant in other_tenants:
        with schema_context(other_tenant.schema_name):
            existing_active = Employee.objects.filter(email=email).exclude(status='TERMINATED').first()
            if existing_active:
                raise ValidationError(
                    f"User dengan email {instance.email} masih terdaftar/aktif di perusahaan {other_tenant.name}"
                )


@receiver(post_delete, sender=Employee)
def cleanup_user_on_employee_delete(sender, instance, **kwargs):
    """
    When an Employee profile is deleted permanently:
    1. Remove the current tenant from their associated User account.
    2. If the User is no longer linked to any tenants, and is not a global administrator/staff,
       delete the User account from the public schema.
    """
    tenant = connection.tenant
    if not tenant or tenant.schema_name == 'public':
        return

    from users.models import User
    from django_tenants.utils import schema_context
    from django.core.exceptions import ValidationError

    should_delete = False
    with schema_context('public'):
        user = User.objects.filter(email=instance.email).first()
        if user:
            # Check if this user is a staff/admin and if they are the last admin of the current tenant
            is_last_admin = False
            if user.is_staff and user.is_active:
                admin_count = User.objects.filter(
                    tenants=tenant,
                    is_staff=True,
                    is_active=True
                ).exclude(pk=user.pk).count()
                if admin_count == 0:
                    is_last_admin = True

            # Only remove the tenant if they are not the last active administrator
            if not is_last_admin:
                try:
                    user.tenants.remove(tenant)
                except ValidationError:
                    pass
            
            # If the user has no more tenants and is not a superuser/global admin/global role, delete them.
            if not user.tenants.exists() and not (user.is_superuser or user.is_global_admin or user.global_role):
                should_delete = True

    if should_delete:
        user = User.objects.filter(email=instance.email).first()
        if user:
            try:
                user.delete()
            except ValidationError:
                pass
