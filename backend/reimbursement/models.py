from django.db import models
from core.models import Employee
from core.audit import AuditModel

class ReimbursementCategory(AuditModel):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    max_amount = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)

    def __str__(self):
        return self.name

class Reimbursement(AuditModel):
    STATUS_CHOICES = [
        ('PENDING', 'Menunggu Persetujuan'),
        ('APPROVED', 'Disetujui'),
        ('REJECTED', 'Ditolak'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='reimbursements')
    category = models.ForeignKey(ReimbursementCategory, on_delete=models.PROTECT, related_name='reimbursements')
    date = models.DateField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField()
    receipt_number = models.CharField(max_length=100, blank=True, null=True)
    attachment = models.FileField(upload_to='reimbursements/', blank=True, null=True)
    
    # Multi-stage approval
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    supervisor_status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    finance_status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    
    # Approved details
    approved_amount = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.employee.fullname} - {self.category.name} ({self.amount})"
