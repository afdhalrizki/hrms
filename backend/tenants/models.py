from django.db import models
from django_tenants.models import TenantMixin, DomainMixin

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
        # Set default modules and quotas based on plan if not already set
        if not self.pk:
            if not self.enabled_modules:
                if self.plan_type == 'FREE':
                    self.enabled_modules = ['core', 'attendance']
                    self.max_employees = 10
                    self.storage_limit_mb = 100
                elif self.plan_type == 'ESSENTIAL':
                    self.enabled_modules = ['core', 'attendance', 'leaves']
                    self.max_employees = 50
                    self.storage_limit_mb = 100
                elif self.plan_type == 'PROFESSIONAL':
                    self.enabled_modules = ['core', 'attendance', 'payroll', 'reimbursement']
                    self.max_employees = 500
                    self.storage_limit_mb = 2000
                elif self.plan_type == 'PREMIUM':
                    self.enabled_modules = ['core', 'attendance', 'payroll', 'reimbursement', 'performance']
                    self.max_employees = 2000
                    self.storage_limit_mb = 5000
                elif self.plan_type == 'ENTERPRISE':
                    self.enabled_modules = ['core', 'attendance', 'payroll', 'reimbursement', 'performance', 'analytics', 'audit']
                    self.max_employees = 10000
                    self.storage_limit_mb = 20000
            
            # Quotas should still be applied if not default
            if self.plan_type == 'FREE':
                self.max_employees = 10
            elif self.plan_type == 'ESSENTIAL':
                self.max_employees = 50
            elif self.plan_type == 'PROFESSIONAL':
                self.max_employees = 500
            elif self.plan_type == 'PREMIUM':
                self.max_employees = 2000
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
