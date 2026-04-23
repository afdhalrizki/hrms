import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings')

import django
django.setup()

from django_tenants.utils import schema_context

from core.models import Employee
from users.models import Tenant

def test():
    print("Testing tenant access...")
    try:
        tenant = Tenant.objects.get(schema_name='company1')
        print(f"Found tenant: {tenant.schema_name}")
        
        with schema_context('company1'):
            employees = Employee.objects.all()
            print(f"Found {employees.count()} employees in company1")
            for e in employees:
                print(f" - {e.fullname} ({e.email})")
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test()
