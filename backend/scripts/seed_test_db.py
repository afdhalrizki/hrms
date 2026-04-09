import os, django, sys
from pathlib import Path
from dotenv import load_dotenv

# 1. Adjust paths because script is now in backend/scripts/
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
ROOT_DIR = BACKEND_DIR.parent

# 2. Load environment variables from the root environments folder
env_path = ROOT_DIR / 'deploy' / 'environments' / '.env.local'
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
    public_tenant = Tenant.objects.get(schema_name='public')
except Tenant.DoesNotExist:
    public_tenant = Tenant.objects.create(schema_name='public', name='Public Tenant')
    from tenants.models import Domain
    Domain.objects.get_or_create(domain='localhost', tenant=public_tenant, is_primary=True)
    Domain.objects.get_or_create(domain='127.0.0.1', tenant=public_tenant, is_primary=False)

try:
    tenant = Tenant.objects.get(schema_name='company1')
    tenant.plan_type = 'ENTERPRISE'
    tenant.enabled_modules = ['core', 'attendance', 'payroll', 'reimbursement', 'analytics', 'audit', 'performance']
    tenant.save()
except Tenant.DoesNotExist:
    tenant = Tenant.objects.create(
        schema_name='company1', 
        name='Company One',
        plan_type='ENTERPRISE',
        enabled_modules=['core', 'attendance', 'payroll', 'reimbursement', 'analytics', 'audit', 'performance']
    )

from tenants.models import Domain
# For E2E tests on local environment, map localhost and 127.0.0.1 to company1
Domain.objects.update_or_create(domain='company1.localhost', defaults={'tenant': tenant, 'is_primary': True})
Domain.objects.update_or_create(domain='localhost', defaults={'tenant': tenant, 'is_primary': False})
Domain.objects.update_or_create(domain='127.0.0.1', defaults={'tenant': tenant, 'is_primary': False})

try:
    tenant2 = Tenant.objects.get(schema_name='company2')
except Tenant.DoesNotExist:
    tenant2 = Tenant.objects.create(schema_name='company2', name='Company Two')
    from tenants.models import Domain
    Domain.objects.create(domain='company2.localhost', tenant=tenant2, is_primary=True)

test_users = [
    # Company 1
    {'email': 'admin@company1.com', 'is_staff': True, 'is_superuser': False, 'tenant': tenant},
    {'email': 'manager1@company1.com', 'is_staff': True, 'is_superuser': False, 'tenant': tenant},
    {'email': 'employee1@company1.com', 'is_staff': False, 'is_superuser': False, 'tenant': tenant},
    # Company 2
    {'email': 'admin@company2.com', 'is_staff': True, 'is_superuser': False, 'tenant': tenant2},
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
    user.tenants.clear() # Ensure strict isolation for E2E tests
    user.tenants.add(user_data['tenant'])
    user.save()
    print(f"{'Created' if created else 'Updated'} user: {user.email}")

# Now ensure Employee records exist in company1 schema
with schema_context('company1'):
    # Cleanup mutated state from previous test runs
    from attendance.models import Attendance, LeaveRequest, Overtime, Shift, Schedule, LeaveBalance
    from payroll.models import PayrollPeriod, Payslip
    from performance.models import AppraisalReview, Appraisal
    from core.models import WorkflowConfig, WorkflowStage
    from reimbursement.models import Reimbursement, ReimbursementCategory
    
    Attendance.objects.all().delete()
    LeaveRequest.objects.all().delete()
    Overtime.objects.all().delete()
    Reimbursement.objects.all().delete()
    ReimbursementCategory.objects.all().delete()
    Payslip.objects.all().delete()
    PayrollPeriod.objects.all().delete()
    AppraisalReview.objects.all().delete()
    Appraisal.objects.all().delete()
    WorkflowStage.objects.all().delete()
    WorkflowConfig.objects.all().delete()
    Shift.objects.all().delete()
    
    # Cleanup core master data to avoid unique constraint violations
    Employee.objects.all().delete()
    Role.objects.all().delete()
    Department.objects.all().delete()
    Golongan.objects.all().delete()
    AccessRole.objects.all().delete()

    dept, _ = Department.objects.get_or_create(name="Engineering")
    role_se, _ = Role.objects.get_or_create(name="Software Engineer", department=dept)
    gol, _ = Golongan.objects.get_or_create(name="3A", defaults={'base_salary': 5000000})
    
    # Roles
    admin_role, _ = AccessRole.objects.get_or_create(
        name="Admin",
        defaults={'permissions': {
            'manage_performance': True, 
            'manage_attendance': True, 
            'manage_payroll': True, 
            'manage_branding': True,
            'manage_settings': True,
            'manage_hr': True,
            'view_audit': True
        }}
    )
    manager_role, _ = AccessRole.objects.get_or_create(
        name="Manager",
        defaults={'permissions': {
            'manage_performance': True, 
            'manage_attendance': True, 
            'view_payroll': True,
            'view_performance': True
        }}
    )
    staff_role, _ = AccessRole.objects.get_or_create(
        name="Staff",
        defaults={'permissions': {
            'manage_performance': False, 
            'manage_attendance': False, 
            'view_payroll': False,
            'manage_settings': False,
            'manage_hr': False
        }}
    )

    # Admin (Employee record) - Seeded first for ID 1
    admin_emp, _ = Employee.objects.get_or_create(
        email='admin@company1.com',
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
    
    # Manager
    manager_emp, _ = Employee.objects.get_or_create(
        email='manager1@company1.com',
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
    
    # Employee
    employee_emp, _ = Employee.objects.get_or_create(
        email='employee1@company1.com',
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
    employee_emp.access_role = staff_role
    employee_emp.save()
    
    # Reimbursement Categories
    med_cat, _ = ReimbursementCategory.objects.get_or_create(name="Medical", defaults={'max_amount': 1000000})
    travel_cat, _ = ReimbursementCategory.objects.get_or_create(name="Travel", defaults={'max_amount': 5000000})
    
    # Shifts & Schedules
    shift, _ = Shift.objects.get_or_create(
        name="Standard", 
        defaults={'start_time': "09:00:00", 'end_time': "18:00:00", 'work_days': [0,1,2,3,4]}
    )
    # Seed schedules for both admin and employee
    Schedule.objects.get_or_create(employee=admin_emp, shift=shift, date=date.today())
    Schedule.objects.get_or_create(employee=employee_emp, shift=shift, date=date.today())
    
    # Leave Balance
    lb1, _ = LeaveBalance.objects.get_or_create(employee=admin_emp, year=2026, defaults={'total_days': 12, 'used_days': 0})
    lb2, _ = LeaveBalance.objects.get_or_create(employee=employee_emp, year=2026, defaults={'total_days': 12, 'used_days': 0})
    print(f"Seeded LeaveBalances for {admin_emp.email} and {employee_emp.email}")

    # Add Appraisal Data for performance test
    from performance.models import KPI, KPITarget, Appraisal
    kpi, _ = KPI.objects.get_or_create(name="Sales Target", unit=KPI.Unit.CURRENCY)
    print(f"Seeded KPI: {kpi.name}")
    
    # Employee Appraisal
    kt, _ = KPITarget.objects.get_or_create(
        employee=employee_emp,
        kpi=kpi,
        period=date(2026, 1, 1),
        defaults={'target_value': 1000000, 'actual_value': 0}
    )
    print(f"Seeded KPITarget for {employee_emp.email}")
    app, _ = Appraisal.objects.get_or_create(
        employee=employee_emp,
        period_name="Q1 2026",
        defaults={'start_date': date(2026, 1, 1), 'end_date': date(2026, 3, 31), 'status': 'DRAFT'}
    )
    print(f"Seeded Appraisal for {employee_emp.email}")
    
    # Admin Appraisal
    kt2, _ = KPITarget.objects.get_or_create(
        employee=admin_emp,
        kpi=kpi,
        period=date(2026, 1, 1),
        defaults={'target_value': 5000000, 'actual_value': 0}
    )
    print(f"Seeded KPITarget for {admin_emp.email}")
    app2, _ = Appraisal.objects.get_or_create(
        employee=admin_emp,
        period_name="Q1 2026",
        defaults={'start_date': date(2026, 1, 1), 'end_date': date(2026, 3, 31), 'status': 'PUBLISHED'}
    )
    print(f"Seeded Appraisal for {admin_emp.email}")
    
    # Payslips for Admin
    from payroll.models import PayrollPeriod, Payslip
    
    period, _ = PayrollPeriod.objects.get_or_create(
        month=3,
        year=2026,
        defaults={'start_date': date(2026, 3, 1), 'end_date': date(2026, 3, 31), 'is_closed': True}
    )
    print(f"Seeded PayrollPeriod: {period}")
    
    ps, _ = Payslip.objects.get_or_create(
        employee=admin_emp,
        period=period,
        defaults={
            'basic_salary': 15000000.00,
            'total_allowance': 2000000.00,
            'total_deduction': 500000.00,
            'net_pay': 16500000.00,
            'payment_date': date(2026, 3, 31)
        }
    )
    print(f"Seeded Payslip for {admin_emp.email}")


with schema_context('company2'):
    from attendance.models import Attendance, LeaveRequest, Overtime
    # Ensure company2 tenant also has enterprise features
    t2 = Tenant.objects.get(schema_name='company2')
    t2.plan_type = 'ENTERPRISE'
    t2.enabled_modules = ['core', 'attendance', 'payroll', 'reimbursement', 'analytics', 'audit', 'performance']
    t2.save()
    from core.models import Employee, Department, Role, Golongan
    Attendance.objects.all().delete()
    LeaveRequest.objects.all().delete()
    Overtime.objects.all().delete()
    Employee.objects.all().delete()
    Department.objects.all().delete()
    Role.objects.all().delete()
    Golongan.objects.all().delete()

    # Create minimal master data for company2 admin
    dept2, _ = Department.objects.get_or_create(name="Management")
    role2, _ = Role.objects.get_or_create(name="Regional Manager", department=dept2)
    gol2, _ = Golongan.objects.get_or_create(name="4A", defaults={'base_salary': 10000000})

    Employee.objects.get_or_create(
        email='admin@company2.com',
        defaults={
            'nik': 'ADM002',
            'fullname': 'Admin Two',
            'department': dept2,
            'role': role2,
            'golongan': gol2,
            'join_date': date(2025, 1, 1),
            'ktp_number': 'ADM456'
        }
    )

print("Successfully seeded all test users and employee records.")
