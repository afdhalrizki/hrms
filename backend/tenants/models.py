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

    from django.core.validators import MinValueValidator, MaxValueValidator
    max_admins = models.IntegerField(
        default=5, 
        validators=[MinValueValidator(1), MaxValueValidator(100)],
        help_text="Batas maksimal jumlah administrator untuk tenant ini (1-100)"
    )

    # default true, schema will be automatically created and synced when it is saved
    auto_create_schema = True

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
