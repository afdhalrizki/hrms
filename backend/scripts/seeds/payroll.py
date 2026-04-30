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
            
        from django.utils import timezone
        today = timezone.localdate()
        
        period, _ = PayrollPeriod.objects.get_or_create(
            month=today.month, year=today.year,
            defaults={
                'start_date': today.replace(day=1),
                'end_date': (today.replace(day=28) + timezone.timedelta(days=4)).replace(day=1) - timezone.timedelta(days=1),
                'is_closed': False
            }
        )
        Payslip.objects.update_or_create(
            employee=employee, period=period,
            defaults={
                'basic_salary': 15000000, 
                'net_pay': 16500000, 
                'payment_date': today
            }
        )
        print(f"      ✅ Seeded payroll for {employee.email}")
