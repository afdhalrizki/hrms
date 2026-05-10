from decimal import Decimal
from core.tests.base import HRMSTestCase as TenantTestCase
from django_tenants.utils import schema_context
from core.models import Employee, Grade
from attendance.models import Attendance
from payroll.models import PayrollPeriod, Payslip, PayslipDetail
from payroll.services import PayrollCalculator
import pytest

class AllowanceIntegrationTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        with schema_context(self.tenant.schema_name):
            self.gol = Grade.objects.create(
                name="G_ALLOW",
                base_salary=Decimal('5000000'),
                meal_allowance=Decimal('50000'),
                transport_allowance=Decimal('30000')
            )
            self.employee = Employee.objects.create(
                nik="ALLOW001",
                fullname="Allowance User",
                email="allow@test.com",
                grade=self.gol,
                join_date="2024-01-01",
                ktp_number="ALLOW-1",
                ptkp_status='TK/0'
            )
            self.period = PayrollPeriod.objects.create(
                month=4, year=2026,
                start_date="2026-04-01", end_date="2026-04-30"
            )

    def test_daily_allowance_calculation(self):
        """Verify that meal and transport allowances are multiplied by attendance days."""
        with schema_context(self.tenant.schema_name):
            # Create 10 days of attendance
            for i in range(1, 11):
                Attendance.objects.create(
                    employee=self.employee,
                    date=f"2026-04-{i:02d}",
                    status='PRESENT'
                )
            
            calc = PayrollCalculator(self.employee, self.period)
            payslip = calc.run()
            
            # Basic: 5,000,000
            # Meal: 50,000 * 10 = 500,000
            # Transport: 30,000 * 10 = 300,000
            # Total Allowance: 800,000
            
            self.assertEqual(payslip.total_allowance, Decimal('800000'))
            self.assertEqual(payslip.basic_salary, Decimal('5000000'))
            
            # Verify details
            meal_detail = PayslipDetail.objects.get(payslip=payslip, description__icontains='Makan')
            self.assertEqual(meal_detail.amount, Decimal('500000'))
            
            trans_detail = PayslipDetail.objects.get(payslip=payslip, description__icontains='Transport')
            self.assertEqual(trans_detail.amount, Decimal('300000'))

    def test_zero_attendance_zero_allowance(self):
        """Allowances should be zero if no attendance records exist."""
        with schema_context(self.tenant.schema_name):
            calc = PayrollCalculator(self.employee, self.period)
            payslip = calc.run()
            
            self.assertEqual(payslip.total_allowance, Decimal('0'))
            self.assertFalse(PayslipDetail.objects.filter(payslip=payslip, description__icontains='Makan').exists())
