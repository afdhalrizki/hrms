from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from tenants.models import Tenant
from .global_constants import GLOBAL_ROLE_CHOICES

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email).lower()
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_global_admin', True)
        extra_fields.setdefault('global_role', 'SUPERADMIN')

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)

class User(AbstractUser):
    # Using email as the primary identifier instead of username
    username = None
    email = models.EmailField(unique=True)
    
    # User Preferences
    receive_email_notifications = models.BooleanField(
        default=True,
        help_text="Pengguna setuju menerima notifikasi via email"
    )
    
    # Mapping user to multiple tenants if necessary (e.g. for multi-tenant support users)
    tenants = models.ManyToManyField(Tenant, blank=True, related_name='users')
    
    # Global admin can bypass tenant restrictions (Deprecated, use global_role instead)
    is_global_admin = models.BooleanField(default=False)
    
    # NEW: Global RBAC
    global_role = models.CharField(
        max_length=50, 
        choices=GLOBAL_ROLE_CHOICES, 
        null=True, 
        blank=True,
        help_text="Menentukan akses pada Portal Admin Utama (SaaS)"
    )

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.email

    @property
    def permissions(self):
        """
        Returns the raw permissions JSON from the associated Employee's AccessRole.
        Used by the frontend to enforce dynamic feature flags.
        """
        try:
            from core.models import Employee
            employee = Employee.objects.filter(email=self.email).select_related('access_role').first()
            if employee and employee.access_role:
                return employee.access_role.permissions
        except:
            pass
        return {}

    @property
    def role(self):
        """
        Synthesized role for frontend consumption.
        Derives from Employee's capabilities instead of just the role name.
        """
        if self.global_role:
            return self.global_role
        if self.is_superuser or self.is_global_admin:
            return 'SUPERADMIN'
            
        from core import constants
        perms = self.permissions
        
        # 1. Admin Capability (tenant_manage_settings / tenant_manage_hr / tenant_manage_access_roles)
        # Even if role name is renamed, presence of these permissions signals ADMIN status to UI
        if perms.get(constants.TENANT_MANAGE_SETTINGS) or perms.get(constants.TENANT_MANAGE_ACCESS_ROLES) or self.is_staff:
            return 'ADMIN'
            
        # 2. Manager Capability (approve_* things or view_reports)
        is_manager = any([
            perms.get(constants.TENANT_APPROVE_LEAVE),
            perms.get(constants.TENANT_APPROVE_REIMBURSEMENT),
            perms.get(constants.TENANT_APPROVE_ATTENDANCE_CORRECTION),
            perms.get(constants.TENANT_APPROVE_OVERTIME),
            perms.get(constants.TENANT_VIEW_PERFORMANCE_REPORT)
        ])
        if is_manager:
            return 'MANAGER'
            
        return 'EMPLOYEE'

from django.db.models.signals import m2m_changed, pre_delete
from django.dispatch import receiver
from django.core.exceptions import ValidationError

@receiver(m2m_changed, sender=User.tenants.through)
def prevent_last_admin_removal_from_tenant(sender, instance, action, reverse, model, pk_set, **kwargs):
    """
    Prevents the last admin of a tenant from being removed from that tenant 
    via the ManyToMany relationship (e.g. user.tenants.remove(tenant)).
    """
    if action == "pre_remove" and not reverse:
        # instance is the User being removed from tenants identified in pk_set
        if instance.is_staff and instance.is_active:
            for tenant_id in pk_set:
                admin_count = User.objects.filter(
                    tenants__id=tenant_id, 
                    is_staff=True,
                    is_active=True
                ).exclude(pk=instance.pk).count()
                
                if admin_count == 0:
                    from tenants.models import Tenant
                    tenant_name = Tenant.objects.get(id=tenant_id).name
                    raise ValidationError(f"Cannot remove user from tenant '{tenant_name}'. They are the last active administrator.")

@receiver(pre_delete, sender=User)
def prevent_last_admin_deletion(sender, instance, **kwargs):
    """
    Prevents an admin user from being deleted entirely if they are the 
    last admin of any tenant they belong to.
    """
    if instance.is_staff and instance.is_active:
        tenants = instance.tenants.all()
        for tenant in tenants:
            admin_count = User.objects.filter(
                tenants=tenant, 
                is_staff=True,
                is_active=True
            ).exclude(pk=instance.pk).count()
            
            if admin_count == 0:
                raise ValidationError(
                    f"Cannot delete user. The tenant '{tenant.name}' must have at least one active administrator."
                )

from django.db.models.signals import pre_save
@receiver(pre_save, sender=User)
def prevent_last_admin_demotion(sender, instance, **kwargs):
    """
    Prevents an admin from being demoted or changed to inactive 
    if they are the last admin of any tenant they belong to.
    """
    if not instance.pk:
        return

    try:
        original = User.objects.get(pk=instance.pk)
    except User.DoesNotExist:
        return

    if original.is_staff and (not instance.is_staff or not instance.is_active):
        tenants = original.tenants.all()
        for tenant in tenants:
            admin_count = User.objects.filter(
                tenants=tenant, 
                is_staff=True,
                is_active=True
            ).exclude(pk=instance.pk).count()
            
            if admin_count == 0:
                raise ValidationError(
                    f"Cannot demote or deactivate user. The tenant '{tenant.name}' must have at least one active administrator."
                )

@receiver(pre_save, sender=User)
def prevent_admin_overflow(sender, instance, **kwargs):
    """
    Prevents promoting a user to staff if it exceeds the tenant's max_admins.
    """
    if not instance.pk:
        return
    try:
        original = User.objects.get(pk=instance.pk)
    except User.DoesNotExist:
        return

    if not original.is_staff and instance.is_staff and instance.is_active:
        for tenant in instance.tenants.all():
            current_admins = User.objects.filter(tenants=tenant, is_staff=True, is_active=True).count()
            if current_admins >= tenant.max_admins:
                raise ValidationError(f"Batas maksimal administrator untuk '{tenant.name}' adalah {tenant.max_admins}. Saat ini sudah mencapai batas.")

@receiver(m2m_changed, sender=User.tenants.through)
def prevent_admin_overflow_m2m(sender, instance, action, reverse, model, pk_set, **kwargs):
    """
    Prevents adding an admin user to a tenant if it exceeds the limit.
    """
    if action == "pre_add":
        if not reverse:
            # instance is User, pk_set is tenant IDs
            if instance.is_staff and instance.is_active:
                from tenants.models import Tenant
                for tenant_id in pk_set:
                    tenant = Tenant.objects.get(id=tenant_id)
                    current_admins = User.objects.filter(tenants=tenant, is_staff=True, is_active=True).count()
                    if current_admins >= tenant.max_admins:
                        raise ValidationError(f"Batas maksimal administrator untuk '{tenant.name}' adalah {tenant.max_admins}. Saat ini sudah mencapai batas.")
        else:
            # instance is Tenant, pk_set is user IDs
            tenant = instance
            new_staff_count = User.objects.filter(pk__in=pk_set, is_staff=True, is_active=True).count()
            current_admins = User.objects.filter(tenants=tenant, is_staff=True, is_active=True).count()
            if current_admins + new_staff_count > tenant.max_admins:
                 raise ValidationError(f"Batas maksimal administrator untuk '{tenant.name}' adalah {tenant.max_admins}. Penambahan ini akan melebihi batas (Total Jadi: {current_admins + new_staff_count}).")
