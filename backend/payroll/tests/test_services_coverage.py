from decimal import Decimal
from django_tenants.test.cases import TenantTestCase
from django_tenants.utils import schema_context
from payroll.services import BPJSManager, TaxEngine, PayrollCalculator
from payroll.models import PayrollPeriod, SalaryComponent
from core.models import Employee, Department, Golongan
from datetime import date

class PayrollServicesCoverageTestCase(TenantTestCase):
    def test_bpjs_employment_exception_handling(self):
        """Cover lines 31-32 in payroll/services.py."""
        # Pass something that certainly triggers an exception during Decimal(str(x))
        # Wait, Decimal(str(None)) is Decimal('None'), it doesn't always throw.
        # But maybe a complex object?
        class BadType:
            def __str__(self): raise ValueError("Bad")
            
        # This should trigger the try-except block
        res = BPJSManager.calculate_employment(Decimal('1000'), jkk_rate=BadType())
        self.assertEqual(res['jkk']['company'], Decimal('2')) # Default 0.0024 * 1000 = 2.4 -> 2

    def test_tax_engine_category_c_high_gross(self):
        """Cover lines 88-90 in payroll/services.py."""
        # Category C is for K/3
        emp = Employee(ptkp_status='K/3')
        # Rate for > 10.35M and <= 20M is 0.02
        tax = TaxEngine.calculate_monthly_pph21(emp, Decimal('15000000'))
        self.assertEqual(tax, Decimal('300000')) # 15M * 0.02 = 300k

        # Rate for > 20M is 0.08
        tax_high = TaxEngine.calculate_monthly_pph21(emp, Decimal('21000000'))
        self.assertEqual(tax_high, Decimal('1680000')) # 21M * 0.08 = 1.68M

    def test_tax_engine_invalid_category_fallback(self):
        """Cover line 91 in payroll/services.py."""
        rate = TaxEngine.get_ter_rate('INVALID', Decimal('5000000'))
        self.assertEqual(rate, Decimal('0'))

    def test_payroll_calculator_no_golongan(self):
        """Cover line 116 in payroll/services.py."""
        with schema_context(self.tenant.schema_name):
            dept = Department.objects.create(name='IT')
            emp = Employee.objects.create(
                fullname='No Golongan', email='no@test.com', nik='N001',
                join_date=date.today(), ktp_number='1', department=dept
            )
            period = PayrollPeriod.objects.create(month=1, year=2026, start_date=date(2026,1,1), end_date=date(2026,1,31))
            
            calc = PayrollCalculator(emp, period)
            payslip = calc.run()
            self.assertEqual(payslip.basic_salary, Decimal('0'))
