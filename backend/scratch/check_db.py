import os, django, sys
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
env_path = ROOT_DIR / 'deploy' / 'environments' / '.env.local'
load_dotenv(env_path)

sys.path.append('.')
os.environ['DB_HOST'] = 'localhost'
os.environ['DB_PORT'] = '6432'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from tenants.models import Tenant
from core.models import Employee
from django_tenants.utils import schema_context

from users.models import User
admin_user = User.objects.get(email='admin@company1.com')
print(f"User: {admin_user.email}, is_staff: {admin_user.is_staff}")

t = Tenant.objects.get(schema_name='company1')
print(f"Tenant Name: {t.name}")
from tenants.models import Domain
domains = Domain.objects.filter(tenant=t)
for d in domains:
    print(f"Domain: {d.domain}, Primary: {d.is_primary}")

print(f"Tenant Employee Count Field: {t.employee_count}")

with schema_context('company1'):
    actual_count = Employee.objects.count()
    print(f"Actual Employee Table Count: {actual_count}")
    
    from payroll.models import Payslip
    payslips = Payslip.objects.all()
    print(f"Actual Payslip Count: {payslips.count()}")
    for p in payslips:
        print(f"Payslip: {p.employee.fullname}, Net Pay: {p.net_pay}, Basic: {p.basic_salary}")

