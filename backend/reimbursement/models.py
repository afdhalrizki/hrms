from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import Employee
from core.audit import AuditModel

class ReimbursementCategory(AuditModel):
    name = models.CharField(_("name"), max_length=100)
    description = models.TextField(_("description"), blank=True, null=True)
    max_amount = models.DecimalField(_("maximum amount"), max_digits=12, decimal_places=2, blank=True, null=True)

    class Meta:
        verbose_name = _("reimbursement category")
        verbose_name_plural = _("reimbursement categories")

    def __str__(self):
        return self.name

class Reimbursement(AuditModel):
    STATUS_CHOICES = [
        ('PENDING', _('Pending')),
        ('APPROVED', _('Approved')),
        ('REJECTED', _('Rejected')),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='reimbursements', verbose_name=_("employee"))
    category = models.ForeignKey(ReimbursementCategory, on_delete=models.PROTECT, related_name='reimbursements', verbose_name=_("category"))
    date = models.DateField(_("date"))
    amount = models.DecimalField(_("amount"), max_digits=12, decimal_places=2)
    description = models.TextField(_("description"))
    receipt_number = models.CharField(_("receipt number"), max_length=100, blank=True, null=True)
    attachment = models.FileField(_("attachment"), upload_to='reimbursements/', blank=True, null=True)
    
    # Multi-stage approval
    status = models.CharField(_("status"), max_length=10, choices=STATUS_CHOICES, default='PENDING')
    supervisor_status = models.CharField(_("supervisor status"), max_length=10, choices=STATUS_CHOICES, default='PENDING')
    finance_status = models.CharField(_("finance status"), max_length=10, choices=STATUS_CHOICES, default='PENDING')
    
    # Approved details
    approved_amount = models.DecimalField(_("approved amount"), max_digits=12, decimal_places=2, blank=True, null=True)
    notes = models.TextField(_("notes"), blank=True, null=True)

    class Meta:
        verbose_name = _("reimbursement")
        verbose_name_plural = _("reimbursements")

    def __str__(self):
        return f"{self.employee.fullname} - {self.category.name} ({self.amount})"
