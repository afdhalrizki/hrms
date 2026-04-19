from django.db import models
from tenants.models import Tenant
import uuid

class SubscriptionInvoice(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PAID', 'Paid'),
        ('FAILED', 'Failed'),
        ('EXPIRED', 'Expired'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='invoices')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    plan_type = models.CharField(max_length=20)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    
    # Midtrans specific fields
    midtrans_order_id = models.CharField(max_length=100, unique=True)
    snap_token = models.CharField(max_length=255, blank=True, null=True)
    payment_type = models.CharField(max_length=50, blank=True, null=True)
    
    # Subscription extension info
    months_added = models.PositiveIntegerField(default=1)
    is_addon = models.BooleanField(default=False, help_text="True if this is an employee quota purchase")
    addon_count = models.PositiveIntegerField(default=0, help_text="Number of employees added if is_addon is True")
    
    # Storage specific add-ons
    is_storage_addon = models.BooleanField(default=False, help_text="True if this is a storage quota purchase")
    storage_gb_count = models.PositiveIntegerField(default=0, help_text="Number of GB added if is_storage_addon is True")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"Inv-{self.midtrans_order_id} ({self.tenant.name})"

    class Meta:
        ordering = ['-created_at']

class QuotaReductionRequest(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('CANCELLED', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='quota_reductions')
    requested_gb_reduction = models.PositiveIntegerField(help_text="Amount of GB to reduce from extra storage")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    reason = models.TextField(help_text="Tenant's reason for reduction")
    admin_note = models.TextField(blank=True, help_text="Super Admin's review note")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    reviewed_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"Reduction-{self.id} ({self.tenant.name})"

    class Meta:
        ordering = ['-created_at']
