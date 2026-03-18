from django.db import models
from core.audit import AuditModel


class AccessRole(AuditModel):
    """
    Defines the RBAC permissions for a user within a specific tenant.
    """
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    
    # Store dynamic permissions as a JSON dictionary
    # e.g. {"manage_hr": True, "manage_payroll": False}
    permissions = models.JSONField(default=dict, blank=True)
    
    # If True, this is a system-generated default role that shouldn't be deleted
    is_default = models.BooleanField(default=False)

    def __str__(self):
        return self.name


class Department(AuditModel):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name


class Role(AuditModel):
    name = models.CharField(max_length=255)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='roles')
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.name} - {self.department.name}"


class Golongan(AuditModel):
    name = models.CharField(max_length=50, unique=True)
    base_salary = models.DecimalField(max_digits=12, decimal_places=2, help_text="Gaji Pokok")
    meal_allowance = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Tunjangan Makan Harian")
    transport_allowance = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Tunjangan Transport Harian")
    overtime_rate = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Tarif lembur per jam (0 = gunakan formula standar)")

    def __str__(self):
        return self.name


class Employee(AuditModel):
    MARITAL_STATUS_CHOICES = [
        ('TK/0', 'Tidak Kawin Tanpa Tanggungan'),
        ('TK/1', 'Tidak Kawin 1 Tanggungan'),
        ('TK/2', 'Tidak Kawin 2 Tanggungan'),
        ('TK/3', 'Tidak Kawin 3 Tanggungan'),
        ('K/0', 'Kawin Tanpa Tanggungan'),
        ('K/1', 'Kawin 1 Tanggungan'),
        ('K/2', 'Kawin 2 Tanggungan'),
        ('K/3', 'Kawin 3 Tanggungan'),
    ]

    EMPLOYMENT_STATUS_CHOICES = [
        ('PERMANENT', 'Permanent (Tetap)'),
        ('CONTRACT', 'Contract (PKWT)'),
        ('PROBATION', 'Probation (Masa Percobaan)'),
    ]

    nik = models.CharField(max_length=50, unique=True, help_text="Nomor Induk Karyawan")
    fullname = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True, null=True)

    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, related_name='employees')
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, related_name='employees')
    golongan = models.ForeignKey(Golongan, on_delete=models.SET_NULL, null=True, related_name='employees')
    
    # RBAC mapping
    access_role = models.ForeignKey(AccessRole, on_delete=models.SET_NULL, null=True, blank=True, related_name='employees')

    # Hierarchy
    supervisor = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subordinates')

    status = models.CharField(max_length=20, choices=EMPLOYMENT_STATUS_CHOICES, default='PROBATION')
    join_date = models.DateField()

    # PTKP / PPh 21 Requirements
    ktp_number = models.CharField(max_length=20, unique=True)
    npwp_number = models.CharField(max_length=30, blank=True, null=True)
    ptkp_status = models.CharField(max_length=5, choices=MARITAL_STATUS_CHOICES, default='TK/0')

    # Face Recognition Reference
    face_reference = models.ImageField(upload_to='face_references/', blank=True, null=True, help_text="Master photo for face recognition")

    def __str__(self):
        return f"{self.nik} - {self.fullname}"
