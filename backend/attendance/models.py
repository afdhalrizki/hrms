from datetime import date
from django.db import models
from core.models import Employee
from core.audit import AuditModel


class Attendance(AuditModel):
    STATUS_CHOICES = [
        ('PRESENT', 'Hadir'),
        ('LATE', 'Terlambat'),
        ('ABSENT', 'Alpa'),
        ('OFF_SITE', 'Luar Lokasi'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='attendances')
    branch = models.ForeignKey('core.Branch', on_delete=models.SET_NULL, null=True, blank=True, related_name='attendances')
    date = models.DateField()
    check_in = models.TimeField(blank=True, null=True)
    check_out = models.TimeField(blank=True, null=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='ABSENT')

    # GPS & Photo for Mobile Clock-In
    latitude_in = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    longitude_in = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    # ... previous fields ...
    photo_in = models.ImageField(upload_to='attendance_photos/', blank=True, null=True)
    liveness_verified = models.BooleanField(default=False)
    verification_method = models.CharField(max_length=20, default='MANUAL', choices=[
        ('MANUAL', 'Manual'),
        ('FACE', 'Face Match'),
        ('LIVENESS', 'Face + Liveness'),
    ])
    
    is_out_of_bounds = models.BooleanField(default=False)
    distance_from_branch = models.FloatField(null=True, blank=True, help_text="Distance in meters when clock-in")

    class Meta:
        unique_together = ('employee', 'date')

    def __str__(self):
        return f"{self.employee.fullname} - {self.date}"


class LeaveRequest(AuditModel):
    # ... existing LeaveRequest code ...
    TYPE_CHOICES = [
        ('CUTI', 'Cuti'),
        ('IZIN', 'Izin'),
        ('SAKIT', 'Sakit'),
    ]
    STATUS_CHOICES = [
        ('PENDING', 'Menunggu Persetujuan'),
        ('APPROVED', 'Disetujui'),
        ('REJECTED', 'Ditolak'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='leave_requests')
    start_date = models.DateField()
    end_date = models.DateField()
    leave_type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    reason = models.TextField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    
    # Workflow Integration
    current_stage = models.ForeignKey('core.WorkflowStage', on_delete=models.SET_NULL, null=True, blank=True, verbose_name="current stage")
    
    # Backward compatibility / simple flow
    supervisor_status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    hr_status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')

    # Proof of sick leave etc.
    attachment = models.FileField(upload_to='leave_attachments/', blank=True, null=True)

    def __str__(self):
        return f"{self.employee.fullname} - {self.leave_type} ({self.start_date} to {self.end_date})"


class Overtime(AuditModel):
    STATUS_CHOICES = [
        ('PENDING', 'Menunggu Persetujuan'),
        ('APPROVED', 'Disetujui'),
        ('REJECTED', 'Ditolak'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='overtimes')
    date = models.DateField()
    hours = models.DecimalField(max_digits=4, decimal_places=2, help_text="Jumlah jam lembur")
    reason = models.TextField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    
    # Workflow Integration
    current_stage = models.ForeignKey('core.WorkflowStage', on_delete=models.SET_NULL, null=True, blank=True, verbose_name="current stage")
    
    # Backward compatibility / simple flow
    supervisor_status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    hr_status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')

    def __str__(self):
        return f"{self.employee.fullname} - {self.date} ({self.hours} hours)"


class Shift(AuditModel):
    name = models.CharField(max_length=100)  # e.g., Pagi, Sore, Malam, Full Day
    start_time = models.TimeField()
    end_time = models.TimeField()
    break_duration_mins = models.IntegerField(default=60)
    
    is_flexible = models.BooleanField(default=False, help_text="If true, start/end times are used for duration calculation only, not late checks.")
    work_days = models.JSONField(default=list, help_text="List of days (0=Mon, 6=Sun) this shift applies to. e.g. [0,1,2,3,4]")

    def __str__(self):
        return f"{self.name} ({self.start_time} - {self.end_time})"


class Schedule(AuditModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='schedules')
    shift = models.ForeignKey(Shift, on_delete=models.CASCADE, related_name='schedules')
    date = models.DateField()

    class Meta:
        unique_together = ('employee', 'date')

    def __str__(self):
        return f"{self.employee.fullname} - {self.shift.name} ({self.date})"
class LeaveBalance(AuditModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='leave_balances')
    year = models.IntegerField(default=date.today().year)
    total_days = models.IntegerField(default=12, help_text="Total jatah cuti tahunan")
    used_days = models.DecimalField(max_digits=4, decimal_places=1, default=0, help_text="Jumlah hari cuti yang sudah digunakan")

    class Meta:
        unique_together = ('employee', 'year')

    @property
    def remaining_days(self):
        return self.total_days - float(self.used_days)

    def __str__(self):
        return f"{self.employee.fullname} - {self.year} (Remaining: {self.remaining_days})"
