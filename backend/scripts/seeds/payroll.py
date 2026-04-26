from django_tenants.utils import schema_context
from payroll.models import PayrollPeriod, Payslip

def seed_payroll_data(tenant, employee):
    """Seed payroll periods and payslips for an employee."""
    schema_name = tenant.schema_name
    with schema_context(schema_name):
        # Force search_path for reliability
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute(f'SET search_path TO "{schema_name}", public')
            
        period, _ = PayrollPeriod.objects.get_or_create(
            month=4, year=2026,
            defaults={'start_date': '2026-04-01', 'end_date': '2026-04-30', 'is_closed': False}
        )
        Payslip.objects.update_or_create(
            employee=employee, period=period,
            defaults={
                'basic_salary': 15000000, 
                'net_pay': 16500000, 
                'payment_date': '2026-03-31'
            }
        )
        print(f"      ✅ Seeded payroll for {employee.email}")
