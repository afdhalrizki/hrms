from django_tenants.test.cases import TenantTestCase
from django_tenants.utils import schema_context
from core.models import Employee, Department, Role, Golongan
from payroll.models import PayrollPeriod, Payslip
from payroll.services import PayrollCalculator
from decimal import Decimal
import pytest

class PayrollVerificationTestCase(TenantTestCase):
    def test_payroll(self):
        with schema_context(self.tenant.schema_name):
            # 1. Bootstrap Master Data if needed
            dept, _ = Department.objects.get_or_create(name="IT Department")
            role, _ = Role.objects.get_or_create(name="Lead Developer", department=dept)
            golongan, _ = Golongan.objects.get_or_create(
                name="G3", 
                defaults={
                    'base_salary': Decimal('10000000'),
                    'meal_allowance': Decimal('500000'),
                    'transport_allowance': Decimal('500000')
                }
            )
            
            # 2. Ensure an employee exists
            employee, _ = Employee.objects.get_or_create(
                nik="EMP001",
                defaults={
                    'fullname': "John Doe",
                    'email': "john@test.com",
                    'department': dept,
                    'role': role,
                    'golongan': golongan,
                    'join_date': "2024-01-01",
                    'ktp_number': "1234567890",
                    'ptkp_status': 'TK/0'
                }
            )

            # 3. Ensure a period exists
            period, _ = PayrollPeriod.objects.get_or_create(
                month=3, year=2026,
                defaults={'start_date': '2026-03-01', 'end_date': '2026-03-31'}
            )
            
            # 4. Clear existing payslips for this period to avoid unique constraint error
            Payslip.objects.filter(employee=employee, period=period).delete()

            # 5. Run Calculator
            calc = PayrollCalculator(employee, period)
            payslip = calc.run()

            # Verify
            assert payslip.basic_salary == Decimal('10000000')
            assert payslip.net_pay > 0
