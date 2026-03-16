from core.models import Employee, Department, Role, Golongan
from payroll.models import PayrollPeriod, Payslip
from payroll.services import PayrollCalculator
from django_tenants.utils import schema_context
from decimal import Decimal
from django.utils import timezone

def test_payroll():
    schema_name = 'company1'
    with schema_context(schema_name):
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
        employee, created = Employee.objects.get_or_create(
            nik="EMP001",
            defaults={
                'fullname': "John Doe",
                'email': "john@company1.harikerja.com",
                'department': dept,
                'role': role,
                'golongan': golongan,
                'join_date': "2024-01-01",
                'ktp_number': "1234567890",
                'ptkp_status': 'TK/0'
            }
        )

        # 3. Ensure a period exists
        period, created = PayrollPeriod.objects.get_or_create(
            month=3, year=2026,
            defaults={'start_date': '2026-03-01', 'end_date': '2026-03-31'}
        )
        
        print(f"Testing payroll for: {employee.fullname}")
        print(f"Golongan: {employee.golongan.name}, Base Salary: Rp {employee.golongan.base_salary:,.2f}")

        # 4. Clear existing payslips for this period to avoid unique constraint error
        Payslip.objects.filter(employee=employee, period=period).delete()

        # 5. Run Calculator
        calc = PayrollCalculator(employee, period)
        payslip = calc.run()

        print("\n--- Payslip Generated ---")
        print(f"Gross Pay (Basic): Rp {payslip.basic_salary:,.2f}")
        print(f"Tax (PPh 21): Rp {payslip.pph21_tax:,.2f}")
        print(f"Net Pay: Rp {payslip.net_pay:,.2f}")
        
        print("\nDetails:")
        for detail in payslip.details.all():
            prefix = "(-)" if detail.is_deduction else "(+)"
            print(f"  {prefix} {detail.description}: Rp {detail.amount:,.2f}")

if __name__ == "__main__":
    test_payroll()
