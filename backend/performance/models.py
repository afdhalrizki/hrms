from django.db import models
from django.utils.translation import gettext_lazy as _
from core.audit import AuditModel
from core.models import Employee

class KPI(AuditModel):
    class Unit(models.TextChoices):
        PERCENTAGE = 'PERCENTAGE', _('Percentage (%)')
        CURRENCY = 'CURRENCY', _('Currency (IDR)')
        UNIT = 'UNIT', _('Units/Count')

    name = models.CharField(_('KPI Name'), max_length=100)
    description = models.TextField(_('Description'), blank=True)
    category = models.CharField(_('Category'), max_length=50, blank=True)
    unit = models.CharField(_('Unit'), max_length=20, choices=Unit.choices, default=Unit.PERCENTAGE)

    def __str__(self):
        return self.name

class KPITarget(AuditModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='kpi_targets')
    kpi = models.ForeignKey(KPI, on_delete=models.CASCADE)
    target_value = models.DecimalField(_('Target Value'), max_digits=20, decimal_places=2)
    actual_value = models.DecimalField(_('Actual Value'), max_digits=20, decimal_places=2, default=0)
    period = models.DateField(_('Target Period (First day of month)'))
    
    def __str__(self):
        return f"{self.employee.fullname} - {self.kpi.name} ({self.period})"

class Appraisal(AuditModel):
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', _('Draft')
        SUBMITTED = 'SUBMITTED', _('Submitted')
        REVIEWED = 'REVIEWED', _('Reviewed')
        COMPLETED = 'COMPLETED', _('Completed')

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='appraisals')
    period_name = models.CharField(_('Period Name'), max_length=50) # e.g. "Q1 2026"
    status = models.CharField(_('Status'), max_length=20, choices=Status.choices, default=Status.DRAFT)
    start_date = models.DateField()
    end_date = models.DateField()
    
    def __str__(self):
        return f"Appraisal: {self.employee.fullname} - {self.period_name}"

class AppraisalReview(AuditModel):
    class ReviewerType(models.TextChoices):
        SELF = 'SELF', _('Self Review')
        MANAGER = 'MANAGER', _('Manager Review')
        PEER = 'PEER', _('Peer Review')

    appraisal = models.ForeignKey(Appraisal, on_delete=models.CASCADE, related_name='reviews')
    reviewer = models.ForeignKey(Employee, on_delete=models.CASCADE)
    reviewer_type = models.CharField(_('Reviewer Type'), max_length=20, choices=ReviewerType.choices)
    ratings = models.JSONField(_('Ratings Data'), default=dict)
    comments = models.TextField(_('Comments'), blank=True)
    
    def __str__(self):
        return f"{self.reviewer_type} by {self.reviewer.fullname} for {self.appraisal.employee.fullname}"
