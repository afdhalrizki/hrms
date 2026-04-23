from decimal import Decimal
from datetime import date
from django_tenants.test.cases import FastTenantTestCase as TenantTestCase
from django_tenants.utils import schema_context
from core.models import Employee, Department
from payroll.models import PayrollPeriod, Payslip
from payroll.services import PayrollCalculator

class PayrollProrataTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        with schema_context(self.tenant.schema_name):
            self.dept = Department.objects.create(name='Marketing')
            
            # Mid-month joiner (joined on the 16th of a 30-day month)
            # April 2026 has 30 days.
            self.employee = Employee.objects.create(
                fullname='April Joiner',
                email='april@test.com',
                nik='APR001',
                ktp_number='KT001',
                department=self.dept,
                join_date=date(2026, 4, 16)
            )
            
            self.period = PayrollPeriod.objects.create(
                month=4,
                year=2026,
                start_date=date(2026, 4, 1),
                end_date=date(2026, 4, 30),
                is_closed=False
            )

    def test_payroll_prorata_mid_month_joiner(self):
        """
        [DEEP TEST] Verify that a mid-month joiner gets exactly 50% salary 
        if joining on the 16th of a 30-day month (April 2026).
        """
        with schema_context(self.tenant.schema_name):
            from core.models import Golongan
            golongan = Golongan.objects.create(name='Grade A', base_salary=Decimal('10000000'))
            self.employee.golongan = golongan
            self.employee.save()

            calculator = PayrollCalculator(self.employee, self.period)
            payslip = calculator.run()

            # CURRENT EXPECTATION (based on analysis): It will FAIL and give 100% salary
            # BUG: Basic salary should be 5M, not 10M.
            self.assertEqual(payslip.basic_salary, Decimal('5000000'))

    def test_payroll_negative_deductions_floor_to_zero(self):
        """
        [DEEP TEST] Verify that if deductions exceed salary, the net pay is 0 (not negative).
        """
        with schema_context(self.tenant.schema_name):
            from core.models import Golongan
            from payroll.models import SalaryComponent, EmployeeSalaryComponent
            
            golongan = Golongan.objects.create(name='Grade A', base_salary=Decimal('1000000'))
            self.employee.golongan = golongan
            self.employee.save()
            
            # Add a massive deduction component (e.g. Loan repayment 2M)
            comp = SalaryComponent.objects.create(name='Massive Loan', type='DEDUCTION')
            EmployeeSalaryComponent.objects.create(
                employee=self.employee,
                component=comp,
                amount=Decimal('5000000'), # 5M deduction for 1M salary
                is_active=True
            )

            calculator = PayrollCalculator(self.employee, self.period)
            payslip = calculator.run()

            # CURRENT EXPECTATION: It will FAIL and give -4M (approx)
            # BUG: Net pay should be at least 0.
            self.assertGreaterEqual(payslip.net_pay, Decimal('0'))
