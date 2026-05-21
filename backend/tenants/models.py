from django.db import models
from django_tenants.models import TenantMixin, DomainMixin
from django.conf import settings
from django.utils.translation import gettext_lazy as _

def tenant_logo_upload_path(instance, filename):
    from core.utils import tenant_directory_path
    return tenant_directory_path(instance, filename, prefix='tenant_logos')

class Tenant(TenantMixin):
    name = models.CharField(max_length=100)
    created_on = models.DateField(auto_now_add=True)
    
    # Customization Fields
    logo = models.ImageField(upload_to=tenant_logo_upload_path, null=True, blank=True)
    theme_primary_color = models.CharField(max_length=10, default='#6366f1', help_text="Primary brand color (hex)")
    theme_secondary_color = models.CharField(max_length=10, default='#4f46e5', help_text="Secondary brand color (hex)")
    address = models.TextField(null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)
    
    # Payroll Settings
    overtime_rate = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Tarif lembur per jam global (0 = gunakan formula)")
    payroll_overtime_divisor = models.IntegerField(default=173, help_text="Standard pembagi upah lembur (default Indonesia: 173)")
    jkk_rate = models.DecimalField(max_digits=5, decimal_places=4, default=0.0024, help_text="Tarif JKK (Jaminan Kecelakaan Kerja) sesuai tingkat risiko (0.24% - 1.74%)")
    
    # Attendance Deductions
    late_deduction_rate = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Potongan tunjangan makan/transport jika terlambat (flat)")
    absence_deduction_rate = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Potongan gaji jika alpa (flat per hari)")
    
    # Approval Settings
    APPROVAL_LEVEL_CHOICES = [
        ('SUPERVISOR', 'Hanya Atasan'),
        ('HR', 'Hanya HR/Admin'),
        ('BOTH', 'Keduanya (Atasan & HR)'),
    ]
    leave_approval_level = models.CharField(max_length=15, choices=APPROVAL_LEVEL_CHOICES, default='BOTH')
    overtime_approval_level = models.CharField(max_length=15, choices=APPROVAL_LEVEL_CHOICES, default='BOTH')
    reimbursement_approval_level = models.CharField(max_length=15, choices=APPROVAL_LEVEL_CHOICES, default='BOTH')

    # Subscription Management
    SUBSCRIPTION_STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('EXPIRED', 'Expired (Read-Only)'),
        ('SUSPENDED', 'Suspended (Blocked)'),
    ]
    subscription_status = models.CharField(
        max_length=20, 
        choices=SUBSCRIPTION_STATUS_CHOICES, 
        default='ACTIVE'
    )
    expiry_date = models.DateField(null=True, blank=True)
    grace_period_days = models.IntegerField(default=14)

    # Tiering & Feature Access
    PLAN_CHOICES = [
        ('FREE', 'Free Tier'),
        ('ESSENTIAL', 'Essential HR'),
        ('PROFESSIONAL', 'Professional'),
        ('PREMIUM', 'Premium'),
        ('ENTERPRISE', 'Enterprise'),
    ]
    plan_type = models.CharField(max_length=20, choices=PLAN_CHOICES, default='FREE')
    enabled_modules = models.JSONField(default=list, blank=True, help_text="List of enabled modules (e.g. ['payroll', 'attendance'])")
    max_employees = models.PositiveIntegerField(default=10, help_text="Base maximum number of employees allowed for this plan")
    extra_employees = models.PositiveIntegerField(default=0, help_text="Additional employee quota purchased via add-ons")
    storage_limit_mb = models.PositiveIntegerField(default=100, help_text="Maximum storage allowed for this tenant in MB")
    extra_storage_mb = models.PositiveIntegerField(default=0, help_text="Additional storage quota purchased via add-ons (MB)")
    storage_used_bytes = models.PositiveBigIntegerField(default=0, help_text="Current storage usage in bytes")
    employee_count = models.PositiveIntegerField(default=0, help_text="Current number of employees in this tenant")
    is_biometric_enabled = models.BooleanField(default=True, help_text="Allow clock-in without photo if disabled (Emergency Storage Fallback)")
    is_fingerprint_enabled = models.BooleanField(default=False, help_text="Enable fingerprint integration (physical devices and mobile biometrics)")
    
    ATTENDANCE_PLATFORM_CHOICES = [
        ('MOBILE', 'Mobile Only'),
        ('BOTH', 'Mobile & Web'),
    ]
    attendance_platform_policy = models.CharField(
        max_length=10, 
        choices=ATTENDANCE_PLATFORM_CHOICES, 
        default='MOBILE',
        help_text="Control which platform is allowed for clock-in/out."
    )

    from django.core.validators import MinValueValidator, MaxValueValidator
    max_admins = models.IntegerField(
        default=5, 
        validators=[MinValueValidator(1), MaxValueValidator(100)],
        help_text="Batas maksimal jumlah administrator untuk tenant ini (1-100)"
    )

    # default true, schema will be automatically created and synced when it is saved
    auto_create_schema = True

    @property
    def total_employee_capacity(self):
        """Returns the total capacity (Base + Purchased Addons)."""
        return self.max_employees + self.extra_employees

    @property
    def total_storage_capacity_mb(self):
        """Returns the total storage capacity in MB (Base + Purchased Addons)."""
        return self.storage_limit_mb + self.extra_storage_mb

    @property
    def total_storage_capacity_bytes(self):
        """Returns the total storage capacity in Bytes."""
        return self.total_storage_capacity_mb * 1024 * 1024

    @property
    def current_employee_count(self):
        """Returns the current number of employees (cached in the employee_count field)."""
        return self.employee_count

    def is_module_enabled(self, module_name):
        """Check if a specific feature module is enabled for this tenant."""
        if self.plan_type == 'ENTERPRISE':
            return True
        return module_name in self.enabled_modules

    def save(self, *args, **kwargs):
        # 1. Initialize default modules for new tenants
        if not self.pk and not self.enabled_modules:
            if self.plan_type == 'FREE':
                self.enabled_modules = ['core', 'attendance']
            elif self.plan_type == 'ESSENTIAL':
                self.enabled_modules = ['core', 'attendance', 'leaves']
            elif self.plan_type == 'PROFESSIONAL':
                self.enabled_modules = ['core', 'attendance', 'leaves', 'payroll', 'reimbursement']
            elif self.plan_type == 'PREMIUM':
                self.enabled_modules = ['core', 'attendance', 'leaves', 'payroll', 'reimbursement', 'performance', 'rbac']
            elif self.plan_type == 'ENTERPRISE':
                self.enabled_modules = ['core', 'attendance', 'leaves', 'payroll', 'reimbursement', 'performance', 'rbac', 'analytics', 'audit']
        
        # 2. Enforce quotas based on plan_type (on create and update)
        # In testing mode, we allow manual overrides to test quota exhaustion
        from django.conf import settings
        is_testing = getattr(settings, 'TESTING', False)
        
        if self.plan_type == 'FREE':
            if not is_testing or self.max_employees is None: self.max_employees = 10
            if not is_testing or self.storage_limit_mb is None: self.storage_limit_mb = 50
        elif self.plan_type == 'ESSENTIAL':
            if not is_testing or self.max_employees is None: self.max_employees = 25
            if not is_testing or self.storage_limit_mb is None: self.storage_limit_mb = 250
        elif self.plan_type == 'PROFESSIONAL':
            if not is_testing or self.max_employees is None: self.max_employees = 100
            if not is_testing or self.storage_limit_mb is None: self.storage_limit_mb = 1024
        elif self.plan_type == 'PREMIUM':
            if not is_testing or self.max_employees is None: self.max_employees = 500
            if not is_testing or self.storage_limit_mb is None: self.storage_limit_mb = 5120
        elif self.plan_type == 'ENTERPRISE':
            if not is_testing or self.max_employees is None: self.max_employees = 2000
            if not is_testing or self.storage_limit_mb is None: self.storage_limit_mb = 20480
            
        super().save(*args, **kwargs)

    @property
    def is_subscription_active(self):
        from datetime import date
        if not self.expiry_date:
            return True
        return date.today() <= self.expiry_date

    @property
    def is_grace_period(self):
        from datetime import date, timedelta
        if not self.expiry_date:
            return False
        return self.expiry_date < date.today() <= (self.expiry_date + timedelta(days=self.grace_period_days))

    def update_subscription_status(self):
        from datetime import date
        if not self.expiry_date:
            self.subscription_status = 'ACTIVE'
        elif date.today() <= self.expiry_date:
            self.subscription_status = 'ACTIVE'
        elif self.is_grace_period:
            self.subscription_status = 'EXPIRED'
        else:
            self.subscription_status = 'SUSPENDED'
        self.save()

class Domain(DomainMixin):
    pass

class RegistrationRequest(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending Approval'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]
    company_name = models.CharField(max_length=100)
    subdomain_prefix = models.SlugField(max_length=50, unique=True)
    admin_email = models.EmailField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    
    # Internal metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.company_name} ({self.status})"


class PlatformTicket(models.Model):
    CATEGORY_CHOICES = [
        ('BILLING', _('Billing & Subscription')),
        ('BUG', _('System Bug / Error')),
        ('FEATURE_REQUEST', _('Feature Request')),
        ('ONBOARDING', _('Onboarding Assistance')),
        ('OTHER', _('Other Technical Support')),
    ]
    
    PRIORITY_CHOICES = [
        ('LOW', _('Low')),
        ('MEDIUM', _('Medium')),
        ('HIGH', _('High')),
        ('URGENT', _('Urgent')),
    ]

    STATUS_CHOICES = [
        ('OPEN', _('Open')),
        ('IN_PROGRESS', _('In Progress')),
        ('RESOLVED', _('Resolved')),
        ('CLOSED', _('Closed')),
    ]

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='platform_tickets')
    creator_email = models.EmailField(_("creator email"))
    title = models.CharField(_("title"), max_length=255)
    description = models.TextField(_("description"))
    category = models.CharField(_("category"), max_length=20, choices=CATEGORY_CHOICES, default='OTHER')
    priority = models.CharField(_("priority"), max_length=10, choices=PRIORITY_CHOICES, default='LOW')
    status = models.CharField(_("status"), max_length=15, choices=STATUS_CHOICES, default='OPEN')
    assigned_agent = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='assigned_platform_tickets',
        limit_choices_to={'global_role__in': ['SUPERADMIN', 'SUPPORT_AGENT']}
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("platform ticket")
        verbose_name_plural = _("platform tickets")

    def __str__(self):
        return f"Tenant {self.tenant.name} - #{self.id} {self.title} ({self.status})"


class PlatformTicketMessage(models.Model):
    ticket = models.ForeignKey(PlatformTicket, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    message = models.TextField(_("message"))
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("platform ticket message")
        verbose_name_plural = _("platform ticket messages")

    def __str__(self):
        return f"Message by {self.sender.email} on platform ticket #{self.ticket.id}"

