import os, django, sys
from pathlib import Path
from dotenv import load_dotenv

# 1. Adjust paths because script is now in backend/scripts/
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
ROOT_DIR = BACKEND_DIR.parent

# 2. Load environment variables from the root environments folder
env_path = ROOT_DIR / 'environments' / '.env.local'
load_dotenv(env_path)

# 3. Add backend directory to sys.path so 'config.settings' can be found
sys.path.append(str(BACKEND_DIR))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
os.environ['DB_HOST'] = 'localhost'
django.setup()

from django.contrib.auth import get_user_model
from tenants.models import Tenant
from core.models import Employee, Department, Role, Golongan, AccessRole
from django_tenants.utils import schema_context
from datetime import date

User = get_user_model()

# Check database connection before proceeding
import socket
from django.db import connections
from django.db.utils import OperationalError

def is_db_reachable(host='localhost', port=5432, timeout=0.5):
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(timeout)
        s.connect((host, port))
        s.close()
        return True
    except (socket.timeout, ConnectionRefusedError, OSError):
        return False

if not is_db_reachable():
    print("Database connection failed (Socket Refused). Skipping seeding (this is expected in Mock Mode).")
    sys.exit(0)

db_conn = connections['default']
try:
    db_conn.cursor()
except OperationalError:
    print("Database connection failed (Django OperationalError). Skipping seeding.")
    sys.exit(0)

try:
    tenant = Tenant.objects.get(schema_name='company1')
except Tenant.DoesNotExist:
    print("Tenant 'company1' not found. Please run up.ps1 or migrations first.")
    sys.exit(0)
except Exception as e:
    print(f"Error accessing database: {e}")
    sys.exit(0)

test_users = [
    {'email': 'admin@company1.net', 'is_staff': True, 'is_superuser': False},
    {'email': 'manager1@company1.net', 'is_staff': False, 'is_superuser': False},
    {'email': 'employee1@company1.net', 'is_staff': False, 'is_superuser': False},
]

for user_data in test_users:
    user, created = User.objects.get_or_create(
        email=user_data['email'],
        defaults={
            'is_staff': user_data['is_staff'],
            'is_superuser': user_data['is_superuser'],
        }
    )
    user.set_password('password123')
    user.tenants.add(tenant)
    user.save()
    print(f"{'Created' if created else 'Updated'} user: {user.email}")

# Now ensure Employee records exist in company1 schema
with schema_context('company1'):
    # Cleanup mutated state from previous test runs
    from attendance.models import Attendance
    from payroll.models import PayrollPeriod, Payslip
    from performance.models import AppraisalReview, Appraisal
    
    Attendance.objects.all().delete()
    Payslip.objects.all().delete()
    PayrollPeriod.objects.all().delete()
    AppraisalReview.objects.all().delete()
    Appraisal.objects.all().delete()
    # Reset branding settings if they exist to prevent text match failure on 'Tenant Branding' vs whatever it changes to
    if hasattr(tenant, 'settings'):
        tenant.settings.primary_color = '#6366f1'
        tenant.settings.save()

    dept, _ = Department.objects.get_or_create(name="Engineering")
    role_se, _ = Role.objects.get_or_create(name="Software Engineer", department=dept)
    gol, _ = Golongan.objects.get_or_create(name="3A", defaults={'base_salary': 5000000})
    
    # Manager
    manager_role, _ = AccessRole.objects.get_or_create(
        name="Manager",
        defaults={'permissions': {'manage_performance': True, 'manage_attendance': True, 'view_payroll': True}}
    )
    manager_emp, _ = Employee.objects.get_or_create(
        email='manager1@company1.net',
        defaults={
            'nik': 'MGR001',
            'fullname': 'Manager One',
            'department': dept,
            'role': role_se,
            'golongan': gol,
            'join_date': date(2025, 1, 1),
            'ktp_number': 'MGR123'
        }
    )
    manager_emp.access_role = manager_role
    manager_emp.save()

    # Admin (Employee record)
    admin_role, _ = AccessRole.objects.get_or_create(
        name="Admin",
        defaults={'permissions': {'manage_performance': True, 'manage_attendance': True, 'manage_payroll': True, 'manage_branding': True}}
    )
    admin_emp, _ = Employee.objects.get_or_create(
        email='admin@company1.net',
        defaults={
            'nik': 'ADM001',
            'fullname': 'Admin One',
            'department': dept,
            'role': role_se,
            'golongan': gol,
            'join_date': date(2025, 1, 1),
            'ktp_number': 'ADM123'
        }
    )
    admin_emp.access_role = admin_role
    admin_emp.save()

    # Employee
    employee_emp, _ = Employee.objects.get_or_create(
        email='employee1@company1.net',
        defaults={
            'nik': 'EMP001',
            'fullname': 'Employee One',
            'department': dept,
            'role': role_se,
            'golongan': gol,
            'join_date': date(2025, 1, 1),
            'ktp_number': 'EMP123',
            'supervisor': manager_emp
        }
    )
    employee_emp.supervisor = manager_emp
    employee_emp.save()

    # Add Appraisal Data for performance test
    from performance.models import KPI, KPITarget, Appraisal
    kpi, _ = KPI.objects.get_or_create(name="Sales Target", unit=KPI.Unit.CURRENCY)
    KPITarget.objects.get_or_create(
        employee=employee_emp,
        kpi=kpi,
        period=date(2026, 1, 1),
        defaults={'target_value': 1000000, 'actual_value': 0}
    )
    Appraisal.objects.get_or_create(
        employee=employee_emp,
        period_name="Q1 2026",
        defaults={'start_date': date(2026, 1, 1), 'end_date': date(2026, 3, 31), 'status': 'SUBMITTED'}
    )

print("Successfully seeded all test users and employee records.")
