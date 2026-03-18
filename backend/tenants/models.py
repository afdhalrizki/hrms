from django.db import models
from django_tenants.models import TenantMixin, DomainMixin

class Tenant(TenantMixin):
    name = models.CharField(max_length=100)
    created_on = models.DateField(auto_now_add=True)
    
    # Customization Fields
    logo = models.ImageField(upload_to='tenant_logos/', null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)
    
    # Payroll Settings
    overtime_rate = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Tarif lembur per jam global (0 = gunakan formula)")
    payroll_overtime_divisor = models.IntegerField(default=173, help_text="Standard pembagi upah lembur (default Indonesia: 173)")
    
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
        ('BASIC', 'Basic (Digital Presence)'),
        ('PROFESSIONAL', 'Professional (Operational Efficiency)'),
        ('ENTERPRISE', 'Enterprise (Strategic Human Capital)'),
    ]
    plan_type = models.CharField(max_length=20, choices=PLAN_CHOICES, default='ENTERPRISE')
    enabled_modules = models.JSONField(default=list, blank=True, help_text="List of enabled modules (e.g. ['payroll', 'attendance'])")
    max_employees = models.PositiveIntegerField(default=1000, help_text="Maximum number of employees allowed for this tenant")

    from django.core.validators import MinValueValidator, MaxValueValidator
    max_admins = models.IntegerField(
        default=5, 
        validators=[MinValueValidator(1), MaxValueValidator(100)],
        help_text="Batas maksimal jumlah administrator untuk tenant ini (1-100)"
    )

    # default true, schema will be automatically created and synced when it is saved
    auto_create_schema = True

    def is_module_enabled(self, module_name):
        """Check if a specific feature module is enabled for this tenant."""
        if self.plan_type == 'ENTERPRISE':
            return True
        return module_name in self.enabled_modules

    def save(self, *args, **kwargs):
        # Set default modules and quotas based on plan if not already set
        if not self.pk:
            if self.plan_type == 'BASIC':
                self.enabled_modules = ['core', 'attendance']
                self.max_employees = 50
            elif self.plan_type == 'PROFESSIONAL':
                self.enabled_modules = ['core', 'attendance', 'payroll', 'reimbursement']
                self.max_employees = 250
            elif self.plan_type == 'ENTERPRISE':
                self.enabled_modules = ['core', 'attendance', 'payroll', 'reimbursement', 'analytics', 'audit']
                self.max_employees = 10000
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
