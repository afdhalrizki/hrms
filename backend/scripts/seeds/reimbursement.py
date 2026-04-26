from django_tenants.utils import schema_context
from datetime import date, timedelta
from reimbursement.models import ReimbursementCategory, Reimbursement

def seed_reimbursement_data(tenant, employee):
    """Seed reimbursement categories and requests for an employee."""
    schema_name = tenant.schema_name
    with schema_context(schema_name):
        # Force search_path for reliability
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute(f'SET search_path TO "{schema_name}", public')
            
        cat_transport, _ = ReimbursementCategory.objects.update_or_create(
            name='Transport', 
            defaults={'max_amount': 2000000}
        )
        cat_medical, _ = ReimbursementCategory.objects.update_or_create(
            name='Medical', 
            defaults={'max_amount': 1000000}
        )
        Reimbursement.objects.update_or_create(
            employee=employee, category=cat_transport, date=date.today() - timedelta(days=2),
            defaults={
                'amount': 250000, 
                'description': 'Taxi to client', 
                'status': 'APPROVED', 
                'approved_amount': 250000
            }
        )
        print(f"      ✅ Seeded reimbursement for {employee.email}")
