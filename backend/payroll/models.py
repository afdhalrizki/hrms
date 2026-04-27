from django.db import models
from core.models import Employee
from core.audit import AuditModel


class SalaryComponent(AuditModel):
    TYPE_CHOICES = [
        ('ALLOWANCE', 'Tunjangan (Penambah)'),
        ('DEDUCTION', 'Potongan / Pinjaman (Pengurang)'),
    ]
    name = models.CharField(max_length=100)
    type = models.CharField(max_length=15, choices=TYPE_CHOICES)
    is_taxable = models.BooleanField(default=True, help_text="Apakah komponen ini kena pajak PPh 21?")

    def __str__(self):
        return f"{self.name} ({self.get_type_display()})"


class PayrollPeriod(AuditModel):
    month = models.IntegerField(choices=[(i, i) for i in range(1, 13)])
    year = models.IntegerField()
    start_date = models.DateField()
    end_date = models.DateField()
    is_closed = models.BooleanField(default=False)

    @property
    def name(self):
        return f"{self.month}/{self.year}"

    def __str__(self):
        return f"Periode: {self.month}/{self.year}"


class EmployeeSalaryComponent(AuditModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='salary_components')
    component = models.ForeignKey(SalaryComponent, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    
    # Optional period restriction (if null, it is recurring)
    period = models.ForeignKey(PayrollPeriod, on_delete=models.SET_NULL, null=True, blank=True, help_text="Set if this is a one-time component for a specific period.")
    
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.employee.fullname} - {self.component.name}: {self.amount}"


class Payslip(AuditModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='payslips')
    period = models.ForeignKey(PayrollPeriod, on_delete=models.CASCADE, related_name='payslips')

    # Base computations
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_deduction = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    overtime_pay = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Tax
    pph21_tax = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Final Take Home Pay
    net_pay = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    payment_date = models.DateField(null=True, blank=True)

    @property
    def allowances(self):
        return self.total_allowance

    @property
    def deductions(self):
        return self.total_deduction

    class Meta:
        unique_together = ('employee', 'period')

    def __str__(self):
        return f"Slip {self.employee.fullname} - {self.period}"


class PayslipDetail(AuditModel):
    payslip = models.ForeignKey(Payslip, on_delete=models.CASCADE, related_name='details')
    component = models.ForeignKey(SalaryComponent, on_delete=models.SET_NULL, null=True, blank=True)
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    is_deduction = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.description}: {self.amount}"
