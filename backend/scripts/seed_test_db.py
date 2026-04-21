import os
import sys
import django
from datetime import date, timedelta
from dotenv import load_dotenv
from pathlib import Path

# Setup paths
BACKEND_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BACKEND_DIR.parent
ENV_FILE = ROOT_DIR / 'deploy' / 'environments' / '.env.local'

# Load environment variables
if ENV_FILE.exists():
    print(f"Loading env from {ENV_FILE}")
    load_dotenv(ENV_FILE)
    
    # Overrides for local native run
    if os.environ.get('DB_HOST') == 'db':
        os.environ['DB_HOST'] = '127.0.0.1'
    if os.environ.get('DB_PORT') == '5432':
        os.environ['DB_PORT'] = '5433'
else:
    print(f"Warning: .env.local not found at {ENV_FILE}")

# Setup Django environment
sys.path.append(str(BACKEND_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

print(f"DEBUG: DB_HOST={os.environ.get('DB_HOST')}")
print(f"DEBUG: DB_PORT={os.environ.get('DB_PORT')}")

django.setup()

from django.contrib.auth import get_user_model
from tenants.models import Tenant, Domain
from django_tenants.utils import schema_context

User = get_user_model()

print("--- Seeding Test Database ---")

# 1. Public Tenant
public_tenant, created = Tenant.objects.get_or_create(schema_name='public', defaults={'name': 'Public'})
Domain.objects.filter(domain='localhost').delete()

# 2. Company 1
tenant1, created = Tenant.objects.get_or_create(
    schema_name='company1', 
    defaults={'name': 'Company One', 'plan_type': 'ENTERPRISE'}
)
Domain.objects.update_or_create(domain='company1.localhost', defaults={'tenant': tenant1, 'is_primary': True})
Domain.objects.update_or_create(domain='localhost', defaults={'tenant': tenant1, 'is_primary': False})
Domain.objects.update_or_create(domain='127.0.0.1', defaults={'tenant': tenant1, 'is_primary': False})

# 2.1 Company 2 (for tenant isolation tests)
tenant2, created = Tenant.objects.get_or_create(
    schema_name='company2', 
    defaults={'name': 'Company Two', 'plan_type': 'PROFESSIONAL'}
)
Domain.objects.update_or_create(domain='company2.localhost', defaults={'tenant': tenant2, 'is_primary': True})

# 3. Seeding within company1
with schema_context('company1'):
    from core.models import Employee, Department, Role, Golongan, WorkflowConfig, AccessRole
    from attendance.models import Attendance, LeaveBalance, LeaveRequest
    from payroll.models import PayrollPeriod, Payslip
    from reimbursement.models import ReimbursementCategory, Reimbursement
    from performance.models import KPI, KPITarget, Appraisal, AppraisalReview
    from core.models import Branch, APIKey
    
    # Nuclear Cleanup to ensure clean state
    # Deleting employees first due to foreign keys, then metadata models
    Employee.objects.all().delete()
    Attendance.objects.all().delete()
    AppraisalReview.objects.all().delete()
    Appraisal.objects.all().delete()
    KPITarget.objects.all().delete()
    KPI.objects.all().delete()
    LeaveRequest.objects.all().delete()
    LeaveBalance.objects.all().delete()
    Reimbursement.objects.all().delete()
    ReimbursementCategory.objects.all().delete()
    Payslip.objects.all().delete()
    PayrollPeriod.objects.all().delete()
    Branch.objects.all().delete()
    WorkflowConfig.objects.all().delete()
    APIKey.objects.all().delete()
    
    # Metadata cleanup (careful with dependencies)
    AccessRole.objects.all().delete()
    Role.objects.all().delete()
    Department.objects.all().delete()
    Golongan.objects.all().delete()
    
    dept_eng, _ = Department.objects.get_or_create(name='Engineering')
    role_mgr, _ = Role.objects.get_or_create(name='Manager', department=dept_eng)
    role_se, _ = Role.objects.get_or_create(name='Software Engineer', department=dept_eng)
    gol_3a, _ = Golongan.objects.update_or_create(
        name='3A', 
        defaults={
            'base_salary': 15000000,
            'meal_allowance': 50000,
            'transport_allowance': 30000
        }
    )
    
    # 1. Admin User
    admin_user, created = User.objects.get_or_create(
        email='admin@company1.com',
        defaults={'is_staff': True, 'is_active': True}
    )

    # 0. Access Roles
    ar_admin, _ = AccessRole.objects.get_or_create(
        name='Administrator',
        defaults={
            'permissions': {
                'manage_hr': True,
                'manage_attendance': True,
                'manage_payroll': True,
                'manage_reimbursement': True,
                'manage_performance': True,
                'manage_settings': True,
                'change_tenant_settings': True,
                'view_audit_logs': True,
                'manage_api_keys': True
            },
            'is_default': False
        }
    )
    ar_hr, _ = AccessRole.objects.get_or_create(
        name='HR Manager',
        defaults={'permissions': {'manage_hr': True, 'manage_attendance': True}, 'is_default': False}
    )
    ar_fin, _ = AccessRole.objects.get_or_create(
        name='Finance Staff',
        defaults={'permissions': {'manage_payroll': True}, 'is_default': False}
    )
    admin_user.set_password('password123')
    admin_user.save()
    if not admin_user.tenants.filter(id=tenant1.id).exists():
        admin_user.tenants.add(tenant1)

    admin_emp, _ = Employee.objects.update_or_create(
        email=admin_user.email,
        defaults={
            'fullname': 'Admin One',
            'nik': 'ADM001',
            'ktp_number': '1234567890123456',
            'join_date': '2023-01-01',
            'department': dept_eng,
            'role': role_se,
            'golongan': gol_3a,
            'access_role': ar_admin
        }
    )
    
    # 2. Manager User
    mgr_user, _ = User.objects.get_or_create(
        email='manager1@company1.com',
        defaults={'is_staff': False, 'is_active': True}
    )
    mgr_user.set_password('password123')
    mgr_user.save()
    if not mgr_user.tenants.filter(id=tenant1.id).exists():
        mgr_user.tenants.add(tenant1)

    mgr_emp, _ = Employee.objects.update_or_create(
        email=mgr_user.email,
        defaults={
            'fullname': 'Manager One',
            'nik': 'MGR001',
            'ktp_number': '1234567890123458',
            'join_date': '2023-01-01',
            'department': dept_eng,
            'role': role_mgr,
            'golongan': gol_3a,
            'supervisor': admin_emp,
            'access_role': ar_hr
        }
    )

    # 3. Regular Employee User
    emp1_user, _ = User.objects.get_or_create(
        email='employee1@company1.com',
        defaults={'is_staff': False, 'is_active': True}
    )
    emp1_user.set_password('password123')
    emp1_user.save()
    if not emp1_user.tenants.filter(id=tenant1.id).exists():
        emp1_user.tenants.add(tenant1)
        
    emp1, _ = Employee.objects.update_or_create(
        email=emp1_user.email,
        defaults={
            'fullname': 'Employee One',
            'nik': 'EMP001', # Tests expect EMP001
            'ktp_number': '1234567890123457',
            'join_date': '2023-01-01',
            'department': dept_eng,
            'role': role_se,
            'golongan': gol_3a,
            'supervisor': mgr_emp
        }
    )
    
    # 3.5 Branches
    branch_jakarta, _ = Branch.objects.get_or_create(
        name='Jakarta Office',
        defaults={
            'address': 'Jl. Sudirman No. 1, Jakarta',
            'latitude': -6.2088,
            'longitude': 106.8456,
            'radius_meters': 100,
            'timezone': 'Asia/Jakarta'
        }
    )
    branch_bandung, _ = Branch.objects.get_or_create(
        name='Bandung Hub',
        defaults={
            'address': 'Jl. Dago No. 50, Bandung',
            'latitude': -6.9175,
            'longitude': 107.6191,
            'radius_meters': 150,
            'timezone': 'Asia/Jakarta'
        }
    )
    
    # Update employees to have a branch
    admin_emp.branch = branch_jakarta
    admin_emp.save()
    mgr_emp.branch = branch_jakarta
    mgr_emp.save()
    emp1.branch = branch_jakarta
    emp1.save()

    # 4. Attendance Logs
    from django.utils import timezone
    today = timezone.localdate()
    Attendance.objects.create(
        employee=emp1,
        date=today,
        check_in='08:00:00',
        status='PRESENT',
        liveness_verified=True,
        verification_method='LIVENESS'
    )
    Attendance.objects.create(
        employee=emp1,
        date=today - timedelta(days=1),
        check_in='09:30:00',
        check_out='18:00:00',
        status='LATE',
        liveness_verified=False,
        verification_method='MANUAL'
    )

    # 5. Payroll
    period, _ = PayrollPeriod.objects.get_or_create(
        month=4,
        year=2026,
        defaults={
            'start_date': '2026-04-01', 
            'end_date': '2026-04-30', 
            'is_closed': False
        }
    )
    
    Payslip.objects.update_or_create(
        employee=admin_emp,
        period=period,
        defaults={
            'basic_salary': 15000000,
            'net_pay': 16500000,
            'payment_date': '2026-03-31'
        }
    )

    # 6. Reimbursements
    cat_travel = ReimbursementCategory.objects.create(name='Travel', max_amount=5000000)
    cat_transport = ReimbursementCategory.objects.create(name='Transport', max_amount=2000000)
    cat_food = ReimbursementCategory.objects.create(name='Food', max_amount=1000000)
    cat_medical = ReimbursementCategory.objects.create(name='Medical', max_amount=1000000)

    Reimbursement.objects.update_or_create(
        employee=emp1,
        category=cat_transport,
        date=today - timedelta(days=2),
        defaults={
            'amount': 250000,
            'description': 'Taxi to client',
            'status': 'APPROVED',
            'approved_amount': 250000
        }
    )

    # 7. Leaves
    LeaveBalance.objects.update_or_create(
        employee=emp1,
        year=2026,
        defaults={
            'total_days': 12,
            'used_days': 0
        }
    )
    
    # 8. Performance
    kpi_sales = KPI.objects.create(name='Sales Target', category='Sales', unit='CURRENCY')
    KPITarget.objects.update_or_create(
        employee=emp1,
        kpi=kpi_sales,
        period=date(2026, 1, 1),
        defaults={'target_value': 1000000, 'actual_value': 850000}
    )
    
    appraisal, _ = Appraisal.objects.update_or_create(
        employee=emp1,
        period_name='Q1 2026',
        defaults={
            'status': 'SUBMITTED',
            'start_date': date(2026, 1, 1),
            'end_date': date(2026, 3, 31)
        }
    )
    AppraisalReview.objects.update_or_create(
        appraisal=appraisal,
        reviewer=emp1,
        reviewer_type='SELF',
        defaults={'ratings': {'Sales Target': 4}, 'comments': 'Achieved 85% of target'}
    )

    # 9. Workflows (Required for workflows.spec.ts)
    WorkflowConfig.objects.update_or_create(
        model_type='LEAVE',
        defaults={'name': 'Leave Approval Workflow', 'is_active': True}
    )
    WorkflowConfig.objects.update_or_create(
        model_type='REIMBURSEMENT',
        defaults={'name': 'Reimbursement Workflow', 'is_active': True}
    )

    # 10. API Keys
    APIKey.objects.update_or_create(
        label='ERP Sync',
        defaults={
            'is_active': True,
            'key_prefix': 'erp_sync',
            'key_hash': 'sha256$hashed$secret'
        }
    )

    print("Seeded company1 data successfully.")

# 4. Public Schema Data (Superadmin & Registrations)
with schema_context('public'):
    from tenants.models import RegistrationRequest
    
    # 4.1 Superadmin User
    super_user, _ = User.objects.update_or_create(
        email='superadmin@harikerja.com',
        defaults={
            'is_staff': True, 
            'is_superuser': True, 
            'is_active': True,
            'is_global_admin': True
        }
    )
    super_user.set_password('password123')
    super_user.save()

    # 4.2 Registration Requests (Required for superadmin.spec.ts)
    RegistrationRequest.objects.all().delete()
    RegistrationRequest.objects.create(
        company_name='Pending Corp',
        subdomain_prefix='pending',
        admin_email='admin@pending.com',
        status='PENDING'
    )
    RegistrationRequest.objects.create(
        company_name='Approved Inc',
        subdomain_prefix='approved',
        admin_email='admin@approved.com',
        status='APPROVED'
    )
    
    print("Seeded public schema data (superadmin & registrations) successfully.")

# 5. Seeding within company2
with schema_context('company2'):
    from core.models import Employee, Department, Role, Golongan
    
    # 5.1 Admin User for Company 2
    admin2_user, _ = User.objects.get_or_create(
        email='admin@company2.com',
        defaults={'is_staff': True, 'is_active': True}
    )
    admin2_user.set_password('password123')
    admin2_user.save()
    if not admin2_user.tenants.filter(id=tenant2.id).exists():
        admin2_user.tenants.add(tenant2)

    # Basic Employee Record for Admin 2
    Employee.objects.update_or_create(
        email=admin2_user.email,
        defaults={
            'fullname': 'Admin Two',
            'nik': 'ADM002',
            'ktp_number': '2234567890123456',
            'join_date': '2023-01-01',
        }
    )
    print("Seeded company2 data successfully.")
