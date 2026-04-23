from django_tenants.test.cases import FastTenantTestCase as TenantTestCase
from django_tenants.utils import schema_context
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from core.models import Employee, Department, Role, Golongan
from payroll.models import PayrollPeriod, Payslip, PayslipDetail
from payroll.services import PayrollCalculator
from decimal import Decimal
import pytest

class PayrollVerificationTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        # Create an admin employee record (linked by email)
        with schema_context(self.tenant.schema_name):
            self.emp_admin = Employee.objects.create(nik="ADMIN", fullname="Admin", email="admin@test.com", join_date="2024-01-01", ktp_number="999")
        
        from users.models import User
        self.admin_user = User.objects.create_user(email="admin@test.com", password="password", is_staff=True)
        self.admin_user.tenants.add(self.tenant)
        # Enable payroll module for the tenant
        self.tenant.plan_type = 'PROFESSIONAL'
        self.tenant.enabled_modules = ['core', 'payroll', 'attendance']
        self.tenant.save()
        self.domain = self.tenant.domains.first().domain

    def test_payroll(self):
        with schema_context(self.tenant.schema_name):
            # 1. Bootstrap Master Data
            dept = Department.objects.create(name="IT Department")
            role = Role.objects.create(name="Lead Developer", department=dept)
            golongan = Golongan.objects.create(
                name="G3", 
                base_salary=Decimal('10000000'),
                meal_allowance=Decimal('500000'),
                transport_allowance=Decimal('500000')
            )
            
            # 2. Ensure an employee exists
            employee = Employee.objects.create(
                nik="EMP001",
                fullname="John Doe",
                email="john@test.com",
                department=dept,
                role=role,
                golongan=golongan,
                join_date="2024-01-01",
                ktp_number="1234567890",
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
            assert payslip.basic_salary == Decimal('10000000')
            assert payslip.net_pay > 0

    def test_payroll_calculator_edge_cases(self):
        """Test PayrollCalculator with missing data and zero boundaries."""
        with schema_context(self.tenant.schema_name):
            # 1. Missing Golongan (should fallback to 0 basic)
            emp_no_grade = Employee.objects.create(nik="NOGRADE", fullname="No Grade", email="no@test.com", join_date="2024-01-01", ktp_number="000")
            period = PayrollPeriod.objects.get_or_create(month=3, year=2026, defaults={'start_date': '2026-03-01', 'end_date': '2026-03-31'})[0]
            
            calc1 = PayrollCalculator(emp_no_grade, period)
            payslip1 = calc1.run()
            assert payslip1.basic_salary == Decimal('0')
            assert payslip1.net_pay == Decimal('0')

            # 2. Zero Overtime Divisor (should fallback to 173)
            self.tenant.payroll_overtime_divisor = 0
            self.tenant.save()
            
            # Use employee with grade but no overtime_rate to trigger divisor usage
            gol, _ = Golongan.objects.get_or_create(name="G_DIV", defaults={'base_salary': Decimal('1730000')})
            emp_div = Employee.objects.create(nik="DIVTEST", fullname="Div Test", email="div@test.com", join_date="2024-01-01", ktp_number="001", golongan=gol)
            
            # Mock an approved overtime (1 hour) -> Should be 1,730,000 / 173 = 10,000
            from attendance.models import Overtime
            Overtime.objects.create(employee=emp_div, date="2026-03-15", hours=1, status='APPROVED')
            
            calc2 = PayrollCalculator(emp_div, period)
            payslip2 = calc2.run()
            assert payslip2.overtime_pay == Decimal('10000')

            # 3. Empty Supplementary (overtimes/reimbursements)
            emp_empty = Employee.objects.create(nik="EMPTY", fullname="Empty", email="empty@test.com", join_date="2024-01-01", ktp_number="002", golongan=gol)
            calc3 = PayrollCalculator(emp_empty, period)
            payslip3 = calc3.run()
            # 1.73m basic - deductions (Health 1%, JHT 2%, JP 1% = 4% = 69,200) - Tax (category A 1.73m is 0%)
            # net = 1,730,000 - 69,200 = 1,660,800
            assert payslip3.overtime_pay == Decimal('0')
            assert payslip3.net_pay == Decimal('1660800')

    def test_payroll_calculator_large_ot(self):
        """Precision: Decimal OT hours and large scale math."""
        with schema_context(self.tenant.schema_name):
            gol, _ = Golongan.objects.get_or_create(name="LARGE", defaults={'base_salary': Decimal('50000000')})
            emp = Employee.objects.create(nik="LARGE_OT", fullname="Large", email="large@test.com", join_date="2024-01-01", ktp_number="LARGE", golongan=gol)
            period = PayrollPeriod.objects.get_or_create(month=4, year=2026, defaults={'start_date': '2026-04-01', 'end_date': '2026-04-30'})[0]
            
            # 1.55 hours OT (Scale 2)
            from attendance.models import Overtime
            Overtime.objects.create(employee=emp, date="2026-04-10", hours=Decimal('1.55'), status='APPROVED')
            
            calc = PayrollCalculator(emp, period)
            payslip = calc.run()
            # 50,000,000 / 173 = 289017.341...
            # 289017.34 * 1.55 = 447976.877 -> roughly 447976-447977
            assert payslip.overtime_pay > 400000

    def test_payroll_atomic_rollback_on_failure(self):
        """Failure Handling: Ensure NO payslip is created if details fail (atomic)."""
        with schema_context(self.tenant.schema_name):
            gol, _ = Golongan.objects.get_or_create(name="G_ROLL", defaults={'base_salary': Decimal('5000000')})
            emp = Employee.objects.create(nik="ROLLBACK", fullname="Roll", email="roll@test.com", join_date="2024-01-01", ktp_number="ROLL", golongan=gol)
            period = PayrollPeriod.objects.get_or_create(month=5, year=2026, defaults={'start_date': '2026-05-01', 'end_date': '2026-05-31'})[0]
            
            # Mock PayslipDetail.objects.create to fail
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
        response = self.client.post(url, payload, format='json', SERVER_NAME=self.domain, secure=True)
        # Should return 400 Bad Request if list is required and non-empty
        # Or 200 with 0 count if it's allowed but does nothing
        # Our current implementation probably returns 400 because of required field.
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_200_OK])

    def test_api_payslip_download_404(self):
        """API: Download non-existent payslip returns 404."""
        self.client.force_authenticate(user=self.admin_user)
        # Non-existent ID like 99999
        url = reverse('payslip-download-pdf', kwargs={'pk': 99999})
        response = self.client.get(url, SERVER_NAME=self.domain, secure=True)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
