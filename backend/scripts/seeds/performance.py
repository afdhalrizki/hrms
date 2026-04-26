from django_tenants.utils import schema_context
from datetime import date
from performance.models import KPI, KPITarget, Appraisal, AppraisalReview

def seed_performance_data(tenant, employee):
    """Seed KPIs, targets, and appraisals for an employee."""
    schema_name = tenant.schema_name
    with schema_context(schema_name):
        # Force search_path for reliability
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute(f'SET search_path TO "{schema_name}", public')
            
        kpi_sales, _ = KPI.objects.update_or_create(
            name='Sales Target', 
            defaults={'category': 'Sales', 'unit': 'CURRENCY'}
        )
        KPITarget.objects.update_or_create(
            employee=employee, kpi=kpi_sales, period=date(2026, 1, 1),
            defaults={'target_value': 1000000, 'actual_value': 850000}
        )
        appraisal, _ = Appraisal.objects.update_or_create(
            employee=employee, period_name='Q1 2026',
            defaults={'status': 'SUBMITTED', 'start_date': date(2026, 1, 1), 'end_date': date(2026, 3, 31)}
        )
        AppraisalReview.objects.update_or_create(
            appraisal=appraisal, reviewer=employee, reviewer_type='SELF',
            defaults={'ratings': {'Sales Target': 4}, 'comments': 'Achieved 85% of target'}
        )
        print(f"      ✅ Seeded performance for {employee.email}")
