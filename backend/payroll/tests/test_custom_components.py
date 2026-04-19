from decimal import Decimal
from django_tenants.test.cases import TenantTestCase
from django_tenants.utils import schema_context
from core.models import Employee, Golongan
from payroll.models import PayrollPeriod, SalaryComponent, EmployeeSalaryComponent, Payslip, PayslipDetail
from payroll.services import PayrollCalculator

class CustomComponentIntegrationTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        with schema_context(self.tenant.schema_name):
            self.gol = Golongan.objects.create(
                name="G_CUSTOM",
                base_salary=Decimal('8000000'),
            )
            self.employee = Employee.objects.create(
                nik="CUSTOM001",
                fullname="Custom User",
                email="custom@test.com",
                golongan=self.gol,
                join_date="2024-01-01",
                ktp_number="CUSTOM-1",
                ptkp_status='TK/0'
            )
            self.period = PayrollPeriod.objects.create(
                month=6, year=2026,
                start_date="2026-06-01", end_date="2026-06-30"
            )
            
            # Setup Salary Components
            self.bonus_comp = SalaryComponent.objects.create(name="Performance Bonus", type="ALLOWANCE")
            self.loan_comp = SalaryComponent.objects.create(name="Company Loan", type="DEDUCTION")

    def test_custom_salary_components_apply(self):
        """Verify that EmployeeSalaryComponent entries are applied to the payslip."""
        with schema_context(self.tenant.schema_name):
            # 1. One-time Bonus for this period
            EmployeeSalaryComponent.objects.create(
                employee=self.employee, component=self.bonus_comp, 
                amount=Decimal('2000000'), period=self.period
            )
            
            # 2. Recurring Loan Deduction
            EmployeeSalaryComponent.objects.create(
                employee=self.employee, component=self.loan_comp, 
                amount=Decimal('500000'), period=None # Recurring
            )
            
            # 3. Another bonus for NEXT period (should NOT be applied)
            next_period = PayrollPeriod.objects.create(month=7, year=2026, start_date="2026-07-01", end_date="2026-07-31")
            EmployeeSalaryComponent.objects.create(
                employee=self.employee, component=self.bonus_comp, 
                amount=Decimal('9999999'), period=next_period
            )
            
            calc = PayrollCalculator(self.employee, self.period)
            payslip = calc.run()
            
            # Basic: 8,000,000
            # Bonus: 2,000,000
            # Loan: -500,000
            
            bonus_detail = PayslipDetail.objects.get(payslip=payslip, description="Performance Bonus")
            self.assertEqual(bonus_detail.amount, Decimal('2000000'))
            self.assertFalse(bonus_detail.is_deduction)
            
            loan_detail = PayslipDetail.objects.get(payslip=payslip, description="Company Loan")
            self.assertEqual(loan_detail.amount, Decimal('500000'))
            self.assertTrue(loan_detail.is_deduction)
            
            # Ensure the 9.99m bonus was NOT applied
            self.assertFalse(PayslipDetail.objects.filter(payslip=payslip, amount=Decimal('9999999')).exists())

    def test_inactive_component_not_applied(self):
        """Verify that inactive EmployeeSalaryComponent entries are ignored."""
        with schema_context(self.tenant.schema_name):
            EmployeeSalaryComponent.objects.create(
                employee=self.employee, component=self.bonus_comp, 
                amount=Decimal('1000000'), is_active=False
            )
            
            calc = PayrollCalculator(self.employee, self.period)
            payslip = calc.run()
            
            self.assertFalse(PayslipDetail.objects.filter(payslip=payslip, description="Performance Bonus").exists())
