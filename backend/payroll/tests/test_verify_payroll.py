from decimal import Decimal
from django_tenants.utils import schema_context
from django.urls import reverse
from rest_framework import status
from core.models import Employee, Department, Role, Golongan
from payroll.models import PayrollPeriod, Payslip
from payroll.services import PayrollCalculator
from core.tests.base import BaseHRTestCase
import pytest

class PayrollVerificationTestCase(BaseHRTestCase):
    def setUp(self):
        super().setUp()
        # Create an admin employee record (linked by email)
        with schema_context(self.tenant.schema_name):
            # Using unique NIK to avoid conflicts
            self.emp_admin_verify = Employee.objects.create(
                nik="ADM-VERIFY", fullname="Admin Verify", 
                email="admin_verify@test.com", join_date="2024-01-01", ktp_number="999-VERIFY"
            )
        
        # Enable payroll module for the tenant
        self.tenant.plan_type = 'PROFESSIONAL'
        self.tenant.enabled_modules = ['core', 'payroll', 'attendance']
        self.tenant.save()

    def test_payroll(self):
        with schema_context(self.tenant.schema_name):
            # 1. Reuse Master Data from BaseHRTestCase or create unique
            dept = self.dept
            role = self.role
            golongan = self.gol
            
            # 2. Ensure an employee exists
            employee = Employee.objects.create(
                nik="EMP-VERIFY-001",
                fullname="John Doe",
                email="john_verify@test.com",
                department=dept,
                role=role,
                golongan=golongan,
                join_date="2024-01-01",
                ktp_number="1234567890-VER",
                ptkp_status='TK/0'
            )

            # 3. Ensure a period exists
            period = PayrollPeriod.objects.create(
                month=3, year=2026,
                start_date='2026-03-01', end_date='2026-03-31'
            )
            
            # 4. Run Calculator
            calc = PayrollCalculator(employee, period)
            payslip = calc.run()

            # Verify
            assert payslip.basic_salary == golongan.base_salary
            assert payslip.net_pay > 0

    def test_payroll_calculator_edge_cases(self):
        """Test PayrollCalculator with missing data and zero boundaries."""
        with schema_context(self.tenant.schema_name):
            # 1. Missing Golongan (should fallback to 0 basic)
            emp_no_grade = Employee.objects.create(nik="NOGRADE-V", fullname="No Grade", email="no_v@test.com", join_date="2024-01-01", ktp_number="000-V")
            period = PayrollPeriod.objects.get_or_create(month=3, year=2026, defaults={'start_date': '2026-03-01', 'end_date': '2026-03-31'})[0]
            
            calc1 = PayrollCalculator(emp_no_grade, period)
            payslip1 = calc1.run()
            assert payslip1.basic_salary == Decimal('0')
            assert payslip1.net_pay == Decimal('0')

            # 2. Zero Overtime Divisor (should fallback to 173)
            self.tenant.payroll_overtime_divisor = 0
            self.tenant.save()
            
            # Use employee with grade but no overtime_rate to trigger divisor usage
            gol, _ = Golongan.objects.get_or_create(name="G_DIV_V", defaults={'base_salary': Decimal('1730000')})
            emp_div = Employee.objects.create(nik="DIVTEST-V", fullname="Div Test", email="div_v@test.com", join_date="2024-01-01", ktp_number="001-V", golongan=gol)
            
            # Mock an approved overtime (1 hour) -> Should be 1,730,000 / 173 = 10,000
            from attendance.models import Overtime
            Overtime.objects.create(employee=emp_div, date="2026-03-15", hours=1, status='APPROVED')
            
            calc2 = PayrollCalculator(emp_div, period)
            payslip2 = calc2.run()
            assert payslip2.overtime_pay == Decimal('10000')

    def test_payroll_calculator_large_ot(self):
        """Precision: Decimal OT hours and large scale math."""
        with schema_context(self.tenant.schema_name):
            gol, _ = Golongan.objects.get_or_create(name="LARGE_V", defaults={'base_salary': Decimal('50000000')})
            emp = Employee.objects.create(nik="LARGE_OT_V", fullname="Large", email="large_v@test.com", join_date="2024-01-01", ktp_number="LARGE_V", golongan=gol)
            period = PayrollPeriod.objects.get_or_create(month=4, year=2026, defaults={'start_date': '2026-04-01', 'end_date': '2026-04-30'})[0]
            
            # 1.55 hours OT (Scale 2)
            from attendance.models import Overtime
            Overtime.objects.create(employee=emp, date="2026-04-10", hours=Decimal('1.55'), status='APPROVED')
            
            calc = PayrollCalculator(emp, period)
            payslip = calc.run()
            assert payslip.overtime_pay > 400000

    def test_payroll_atomic_rollback_on_failure(self):
        """Failure Handling: Ensure NO payslip is created if details fail (atomic)."""
        with schema_context(self.tenant.schema_name):
            gol, _ = Golongan.objects.get_or_create(name="G_ROLL_V", defaults={'base_salary': Decimal('5000000')})
            emp = Employee.objects.create(nik="ROLLBACK_V", fullname="Roll", email="roll_v@test.com", join_date="2024-01-01", ktp_number="ROLL_V", golongan=gol)
            period = PayrollPeriod.objects.get_or_create(month=5, year=2026, defaults={'start_date': '2026-05-01', 'end_date': '2026-05-31'})[0]
            
            from unittest.mock import patch
            from django.db import IntegrityError
            
            with patch('payroll.models.PayslipDetail.objects.create') as mock_create:
                mock_create.side_effect = IntegrityError("Simulated DB failure")
                
                calc = PayrollCalculator(emp, period)
                with pytest.raises(IntegrityError):
                    calc.run()
                
                # Verify Payslip was NOT created or was rolled back
                self.assertFalse(Payslip.objects.filter(employee=emp, period=period).exists())

    def test_api_payslip_generate_empty_ids(self):
        """API: Posting empty employee_ids list is handled."""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('payslip-generate')
        payload = {'employee_ids': [], 'month': 3, 'year': 2026}
        response = self.client.post(url, payload, format='json', SERVER_NAME=str(self.domain), secure=True)
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_200_OK])

    def test_api_payslip_download_404(self):
        """API: Download non-existent payslip returns 404."""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('payslip-download-pdf', kwargs={'pk': 99999})
        response = self.client.get(url, SERVER_NAME=str(self.domain), secure=True)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
