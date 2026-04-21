import os
import sys
import django
from dotenv import load_dotenv
from pathlib import Path

# Setup paths
BACKEND_DIR = Path(os.getcwd())
ROOT_DIR = BACKEND_DIR.parent
ENV_FILE = ROOT_DIR / 'deploy' / 'environments' / '.env.local'

if ENV_FILE.exists():
    load_dotenv(ENV_FILE)

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
os.environ['DB_HOST'] = '127.0.0.1'
os.environ['DB_PORT'] = '5433'
django.setup()
from django_tenants.utils import schema_context
from core.models import Employee, Role
from reimbursement.models import ReimbursementCategory
with schema_context('company1'):
    print(f"Total Employees: {Employee.objects.count()}")
    for e in Employee.objects.all():
        print(f"- {e.email} ({e.fullname}, NIK: {e.nik})")
    
    print("\nTotal Roles:")
    for r in Role.objects.all():
        print(f"- {r.name} (Dept: {r.department.name})")

    print("\nTotal Categories:")
    for c in ReimbursementCategory.objects.all():
        print(f"- {c.name} (Max: {c.max_amount})")
