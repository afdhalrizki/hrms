from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.audit import AuditModel
from core.utils import ktp_upload_path, npwp_upload_path, face_reference_upload_path


class AccessRole(AuditModel):
    """
    Defines the RBAC permissions for a user within a specific tenant.
    """
    name = models.CharField(_("name"), max_length=255)
    description = models.TextField(_("description"), blank=True, null=True)
    
    # Store dynamic permissions as a JSON dictionary
    # e.g. {"tenant_manage_hr": True, "tenant_manage_payroll": False}
    permissions = models.JSONField(_("permissions"), default=dict, blank=True)
    
    # If True, this is a system-generated default role that shouldn't be deleted
    is_default = models.BooleanField(_("is default"), default=False)

    class Meta:
        verbose_name = _("access role")
        verbose_name_plural = _("access roles")

    def __str__(self):
        return self.name

    def delete(self, *args, **kwargs):
        if self.is_default:
            raise ValidationError(_("System default roles cannot be deleted."))
        return super().delete(*args, **kwargs)


class Department(AuditModel):
    name = models.CharField(_("name"), max_length=255)
    description = models.TextField(_("description"), blank=True, null=True)

    class Meta:
        verbose_name = _("department")
        verbose_name_plural = _("departments")

    def __str__(self):
        return self.name


class Role(AuditModel):
    name = models.CharField(_("name"), max_length=255)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='roles', verbose_name=_("department"))
    description = models.TextField(_("description"), blank=True, null=True)

    class Meta:
        verbose_name = _("role")
        verbose_name_plural = _("roles")

    def __str__(self):
        return f"{self.name} - {self.department.name}"


class Grade(AuditModel):
    name = models.CharField(_("name"), max_length=50, unique=True)
    base_salary = models.DecimalField(_("base salary"), max_digits=12, decimal_places=2, help_text=_("Gaji Pokok"))
    meal_allowance = models.DecimalField(_("meal allowance"), max_digits=10, decimal_places=2, default=0, help_text=_("Tunjangan Makan Harian"))
    transport_allowance = models.DecimalField(_("transport allowance"), max_digits=10, decimal_places=2, default=0, help_text=_("Tunjangan Transport Harian"))
    overtime_rate = models.DecimalField(_("overtime rate"), max_digits=12, decimal_places=2, default=0, help_text=_("Tarif lembur per jam (0 = gunakan formula standar)"))

    class Meta:
        verbose_name = _("grade")
        verbose_name_plural = _("grades")

    def __str__(self):
        return self.name


class Branch(AuditModel):
    """
    Physical office or outlet location with geofencing support.
    """
    name = models.CharField(_("name"), max_length=255)
    address = models.TextField(_("address"), blank=True, null=True)
    
    # Geofencing
    latitude = models.DecimalField(_("latitude"), max_digits=9, decimal_places=6)
    longitude = models.DecimalField(_("longitude"), max_digits=9, decimal_places=6)
    radius_meters = models.IntegerField(_("radius in meters"), default=100, help_text=_("Allow clock-in within this radius"))
    
    timezone = models.CharField(_("timezone"), max_length=100, default='Asia/Jakarta')

    class Meta:
        verbose_name = _("branch")
        verbose_name_plural = _("branches")

    def __str__(self):
        return self.name


class Employee(AuditModel):
    MARITAL_STATUS_CHOICES = [
        ('TK/0', _('TK/0: Single, No dependents')),
        ('TK/1', _('TK/1: Single, 1 dependent')),
        ('TK/2', _('TK/2: Single, 2 dependents')),
        ('TK/3', _('TK/3: Single, 3 dependents')),
        ('K/0', _('K/0: Married, No dependents')),
        ('K/1', _('K/1: Married, 1 dependent')),
        ('K/2', _('K/2: Married, 2 dependents')),
        ('K/3', _('K/3: Married, 3 dependents')),
    ]

    EMPLOYMENT_STATUS_CHOICES = [
        ('PERMANENT', _('Permanent')),
        ('CONTRACT', _('Contract')),
        ('PROBATION', _('Probation')),
    ]

    nik = models.CharField(_("NIK"), max_length=50, unique=True, help_text=_("Nomor Induk Karyawan"))
    fullname = models.CharField(_("full name"), max_length=255)
    email = models.EmailField(_("email"), unique=True)
    phone = models.CharField(_("phone number"), max_length=20, blank=True, null=True)

    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, related_name='employees', verbose_name=_("department"))
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, related_name='employees', verbose_name=_("role"))
    grade = models.ForeignKey(Grade, on_delete=models.SET_NULL, null=True, related_name='employees', verbose_name=_("grade"))
    
    # RBAC mapping
    access_role = models.ForeignKey(AccessRole, on_delete=models.SET_NULL, null=True, blank=True, related_name='employees', verbose_name=_("access role"))
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name='employees', verbose_name=_("branch"))

    # Hierarchy
    supervisor = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subordinates', verbose_name=_("supervisor"))

    status = models.CharField(_("status"), max_length=20, choices=EMPLOYMENT_STATUS_CHOICES, default='PROBATION')
    join_date = models.DateField(_("join date"))

    # PTKP / PPh 21 Requirements
    ktp_number = models.CharField(_("KTP number"), max_length=20, unique=True)
    npwp_number = models.CharField(_("NPWP number"), max_length=30, blank=True, null=True)
    ptkp_status = models.CharField(_("PTKP status"), max_length=5, choices=MARITAL_STATUS_CHOICES, default='TK/0')

    # Contact & Documentation (Phase 70)
    address = models.TextField(_("home address"), blank=True, null=True)
    ktp_image = models.ImageField(
        _("KTP document scan"), 
        upload_to=ktp_upload_path, 
        blank=True, null=True
    )
    npwp_image = models.ImageField(
        _("NPWP document scan"), 
        upload_to=npwp_upload_path, 
        blank=True, null=True
    )

    # Face Recognition Reference
    face_reference = models.ImageField(
        _("face reference"), 
        upload_to=face_reference_upload_path, 
        blank=True, null=True, 
        help_text=_("Master photo for face recognition")
    )

    class Meta:
        verbose_name = _("employee")
        verbose_name_plural = _("employees")

    def __str__(self):
        return f"{self.nik} - {self.fullname}"


class WorkflowConfig(AuditModel):
    """
    Defines which model (e.g. LeaveRequest) uses which approval workflow.
    """
    MODEL_TYPE_CHOICES = [
        ('LEAVE', _('Leave Request')),
        ('OVERTIME', _('Overtime Request')),
        ('REIMBURSEMENT', _('Reimbursement')),
        ('TRANSFER', _('Employee Transfer')),
        ('ATTENDANCE_CORRECTION', _('Attendance Correction')),
    ]
    
    name = models.CharField(_("workflow name"), max_length=255)
    model_type = models.CharField(_("model type"), max_length=50, choices=MODEL_TYPE_CHOICES)
    is_active = models.BooleanField(_("is active"), default=True)

    class Meta:
        verbose_name = _("workflow config")
        verbose_name_plural = _("workflow configs")
        unique_together = ('model_type',)

    def __str__(self):
        return f"{self.name} ({self.model_type})"


class WorkflowStage(AuditModel):
    """
    A single step in an N-level approval workflow.
    """
    APPROVER_TYPE_CHOICES = [
        ('SUPERVISOR', _('Direct Supervisor')),
        ('ROLE', _('Specific Access Role')),
        ('EMPLOYEE', _('Specific Employee')),
    ]

    workflow = models.ForeignKey(WorkflowConfig, on_delete=models.CASCADE, related_name='stages', verbose_name=_("workflow"))
    name = models.CharField(_("stage name"), max_length=255)
    sequence = models.PositiveIntegerField(_("sequence"), default=1, help_text=_("Order of approval (1, 2, 3...)"))
    
    approver_type = models.CharField(_("approver type"), max_length=20, choices=APPROVER_TYPE_CHOICES, default='SUPERVISOR')
    approver_role = models.ForeignKey(AccessRole, on_delete=models.SET_NULL, null=True, blank=True, verbose_name=_("approver role"))
    approver_employee = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, verbose_name=_("approver employee"))

    class Meta:
        verbose_name = _("workflow stage")
        verbose_name_plural = _("workflow stages")
        ordering = ['sequence']

    def __str__(self):
        return f"{self.workflow.name} - Stage {self.sequence}: {self.name}"


class WorkflowAction(AuditModel):
    """
    History of approvals/rejections for a specific object instance.
    """
    ACTION_CHOICES = [
        ('APPROVED', _('Approved')),
        ('REJECTED', _('Rejected')),
        ('RETURNED', _('Returned/Revised')),
    ]

    # Generic Foreign Key would be better, but for now we link to specific models
    # or use a generic field if possible. 
    # To keep it simple, we'll use a JSON field or just track string IDs.
    target_model = models.CharField(max_length=100)
    target_id = models.PositiveIntegerField()
    
    stage = models.ForeignKey(WorkflowStage, on_delete=models.CASCADE, verbose_name=_("stage"))
    actor = models.ForeignKey(Employee, on_delete=models.CASCADE, null=True, blank=True, verbose_name=_("actor"))
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    comment = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = _("workflow action")
        verbose_name_plural = _("workflow actions")


class APIKey(AuditModel):
    """
    Stores credentials for third-party API access.
    """
    label = models.CharField(_("label"), max_length=100, help_text=_("e.g. Zapier, ERP Sync"))
    key_prefix = models.CharField(max_length=8, unique=True)
    key_hash = models.CharField(max_length=128) # Hashed secret
    
    expires_at = models.DateTimeField(null=True, blank=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = _("API key")
        verbose_name_plural = _("API keys")

    def __str__(self):
        return f"{self.label} ({self.key_prefix}...)"


class AuditLog(models.Model):
    """
    Detailed history of changes to specific objects (CREATE, UPDATE, DELETE).
    """
    ACTION_CHOICES = [
        ('CREATE', _('Create')),
        ('UPDATE', _('Update')),
        ('DELETE', _('Delete')),
    ]

    action_type = models.CharField(max_length=10, choices=ACTION_CHOICES)
    model_name = models.CharField(max_length=100)
    object_id = models.CharField(max_length=100)
    
    # Store the changes as a JSON diff
    # e.g. {"salary": {"old": 5000, "new": 6000}}
    changed_fields = models.JSONField(default=dict)
    
    actor = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, db_constraint=False)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("audit log")
        verbose_name_plural = _("audit logs")
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.action_type} on {self.model_name}:{self.object_id} at {self.timestamp}"
