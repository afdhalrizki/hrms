from decimal import Decimal
from django_tenants.test.cases import TenantTestCase
from django_tenants.utils import schema_context
from core.models import Employee, Golongan
from attendance.models import Attendance
from payroll.models import PayrollPeriod, Payslip, PayslipDetail
from payroll.services import PayrollCalculator
from django.db import connection

class AttendanceDeductionTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        with schema_context(self.tenant.schema_name):
            self.gol = Golongan.objects.create(
                name="G_DEDUCT",
                base_salary=Decimal('10000000'),
            )
            self.employee = Employee.objects.create(
                nik="DEDUCT001",
                fullname="Deduction User",
                email="deduct@test.com",
                golongan=self.gol,
                join_date="2024-01-01",
                ktp_number="DEDUCT-1",
                ptkp_status='TK/0'
            )
            self.period = PayrollPeriod.objects.create(
                month=5, year=2026,
                start_date="2026-05-01", end_date="2026-05-31"
            )
            
            # Setup Tenant Deduction Rates
            self.tenant.late_deduction_rate = Decimal('50000')
            self.tenant.absence_deduction_rate = Decimal('200000')
            self.tenant.save()
            
            # Ensure connection.tenant is updated for the calculator
            connection.tenant = self.tenant

    def test_late_and_absence_deductions(self):
        """Verify that LATE and ABSENT statuses trigger correct deductions."""
        with schema_context(self.tenant.schema_name):
            # 2 days LATE, 1 day ABSENT, 5 days PRESENT
            for i in range(1, 6):
                Attendance.objects.create(employee=self.employee, date=f"2026-05-{i:02d}", status='PRESENT')
            Attendance.objects.create(employee=self.employee, date="2026-05-10", status='LATE')
            Attendance.objects.create(employee=self.employee, date="2026-05-11", status='LATE')
            Attendance.objects.create(employee=self.employee, date="2026-05-12", status='ABSENT')
            
            calc = PayrollCalculator(self.employee, self.period)
            payslip = calc.run()
            
            # Late: 2 * 50,000 = 100,000
            # Absent: 1 * 200,000 = 200,000
            
            late_detail = PayslipDetail.objects.get(payslip=payslip, description__icontains='Terlambat')
            self.assertEqual(late_detail.amount, Decimal('100000'))
            
            absent_detail = PayslipDetail.objects.get(payslip=payslip, description__icontains='Alpa')
            self.assertEqual(absent_detail.amount, Decimal('200000'))
            
            # total_deduction should include these + BPJS + Tax
            # BPJS (TK/0, 10m): 
            # Health 1% = 100,000
            # JHT 2% = 200,000
            # JP 1% (capped 10.04m, so 10m is fine) = 100,000
            # Total BPJS EE = 400,000
            # PPh 21 (Cat A, 10m -> 2%): 200,000
            # Attendance deductions = 300,000
            # Expected Total Deduction = 400k + 200k + 300k = 900,000
            
            self.assertEqual(payslip.total_deduction, Decimal('900000'))

    def test_no_deductions_if_rates_are_zero(self):
        """Verify no deductions are applied if rates are set to 0."""
        self.tenant.late_deduction_rate = 0
        self.tenant.absence_deduction_rate = 0
        self.tenant.save()
        connection.tenant = self.tenant
        
        with schema_context(self.tenant.schema_name):
            Attendance.objects.create(employee=self.employee, date="2026-05-10", status='LATE')
            Attendance.objects.create(employee=self.employee, date="2026-05-11", status='ABSENT')
            
            calc = PayrollCalculator(self.employee, self.period)
            payslip = calc.run()
            
            self.assertFalse(PayslipDetail.objects.filter(payslip=payslip, description__icontains='Terlambat').exists())
            self.assertFalse(PayslipDetail.objects.filter(payslip=payslip, description__icontains='Alpa').exists())
