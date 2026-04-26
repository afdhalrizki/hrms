from django.contrib.auth import get_user_model
from tenants.models import Tenant, Domain
from core.models import Employee, Department, Role, Golongan, AccessRole, Branch, APIKey, WorkflowConfig, WorkflowStage
from django_tenants.utils import schema_context
from django.core.management import call_command
import time

User = get_user_model()

def create_public_data():
    """Seed data for the public schema."""
    with schema_context('public'):
        from tenants.models import RegistrationRequest
        super_user, _ = User.objects.update_or_create(
            email='superadmin@harikerja.com',
            defaults={'is_staff': True, 'is_superuser': True, 'is_active': True, 'is_global_admin': True}
        )
        super_user.set_password('password123')
        super_user.save()

        RegistrationRequest.objects.get_or_create(
            company_name='Pending Corp', 
            subdomain_prefix='pending', 
            admin_email='admin@pending.com', 
            status='PENDING'
        )
        RegistrationRequest.objects.get_or_create(
            company_name='Approved Inc', 
            subdomain_prefix='approved', 
            admin_email='admin@approved.com', 
            status='APPROVED'
        )
        
        # Ensure public tenant has a domain for localhost to prevent middleware failures
        public_tenant, _ = Tenant.objects.get_or_create(
            schema_name='public',
            defaults={'name': 'Public'}
        )
        Domain.objects.get_or_create(
            domain='localhost', 
            defaults={'tenant': public_tenant, 'is_primary': True}
        )
        Domain.objects.get_or_create(
            domain='127.0.0.1', 
            defaults={'tenant': public_tenant, 'is_primary': False}
        )
        print("   ✅ Seeded public schema data and domains.")

def setup_tenant(schema_name, company_name):
    """Ensure tenant exists and is migrated."""
    tenant, _ = Tenant.objects.get_or_create(
        schema_name=schema_name, 
        defaults={
            'name': company_name, 
            'plan_type': 'ENTERPRISE',
            'enabled_modules': ["performance", "core", "attendance", "payroll", "reimbursement"],
            'late_deduction_rate': 50000,
            'absence_deduction_rate': 100000,
            'attendance_platform_policy': 'BOTH'
        }
    )
    Domain.objects.update_or_create(
        domain=f'{schema_name}.localhost', 
        defaults={'tenant': tenant, 'is_primary': True}
    )
    
    # Also add 127.0.0.1 for company1 for convenience
    if schema_name == 'company1':
        Domain.objects.update_or_create(
            domain='127.0.0.1', 
            defaults={'tenant': tenant, 'is_primary': False}
        )

    # Ensure schema is migrated
    for attempt in range(3):
        try:
            call_command('migrate_schemas', tenant=True, schema_name=schema_name, interactive=False, verbosity=0)
            break
        except Exception as e:
            if attempt == 2: raise
            print(f"      Retrying migration for {schema_name}... ({e})")
            time.sleep(2)
    return tenant

def seed_base_data(tenant, admin_email=None):
    """Seed core master data and essential users."""
    schema_name = tenant.schema_name
    admin_email = admin_email or f'admin@{schema_name}.com'
    
    with schema_context(schema_name):
        # Force search_path for reliability
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute(f'SET search_path TO "{schema_name}", public')
            
        # --- BASIC MASTER DATA ---
        dept_eng, _ = Department.objects.get_or_create(name='Engineering')
        role_mgr, _ = Role.objects.get_or_create(name='Manager', department=dept_eng)
        role_se, _ = Role.objects.get_or_create(name='Software Engineer', department=dept_eng)
        gol_3a, _ = Golongan.objects.update_or_create(
            name='3A', 
            defaults={'base_salary': 15000000, 'meal_allowance': 50000, 'transport_allowance': 30000}
        )
        
        # --- ACCESS ROLES ---
        ar_admin, _ = AccessRole.objects.get_or_create(
            name='Administrator',
            defaults={
                'permissions': {
                    'manage_hr': True, 'manage_attendance': True, 'manage_payroll': True,
                    'manage_reimbursement': True, 'manage_performance': True, 'manage_settings': True,
                    'change_tenant_settings': True, 'view_audit_logs': True, 'manage_api_keys': True,
                    'manage_access_roles': True, 'approve_leave': True, 'approve_reimbursement': True,
                    'approve_attendance_correction': True, 'view_all_payslips': True, 'view_performance_report': True
                }
            }
        )
        ar_mgr, _ = AccessRole.objects.get_or_create(
            name='Manager',
            defaults={
                'permissions': {
                    'manage_hr': False, 'manage_attendance': True, 'manage_payroll': False,
                    'manage_reimbursement': True, 'manage_performance': True, 'manage_settings': False,
                    'view_payroll': True
                }
            }
        )
        ar_finance, _ = AccessRole.objects.get_or_create(
            name='Finance Staff',
            defaults={
                'permissions': {
                    'manage_hr': False, 'manage_attendance': False, 'manage_payroll': True,
                    'manage_reimbursement': True, 'manage_performance': False, 'manage_settings': False,
                    'view_all_payslips': True
                }
            }
        )
        ar_hr_mgr, _ = AccessRole.objects.get_or_create(
            name='HR Manager',
            defaults={
                'permissions': {
                    'manage_hr': True, 'manage_attendance': True, 'manage_payroll': True,
                    'manage_reimbursement': True, 'manage_performance': True, 'manage_settings': True,
                    'view_all_payslips': True
                }
            }
        )

        # --- BRANCHES ---
        branch_jkt, _ = Branch.objects.get_or_create(
            name='Jakarta Office',
            defaults={
                'address': 'Jl. Sudirman No. 1, Jakarta',
                'latitude': -6.2088, 'longitude': 106.8456,
                'radius_meters': 100, 'timezone': 'Asia/Jakarta'
            }
        )
        branch_bdg, _ = Branch.objects.get_or_create(
            name='Bandung Hub',
            defaults={
                'address': 'Jl. Asia Afrika No. 10, Bandung',
                'latitude': -6.9175, 'longitude': 107.6191,
                'radius_meters': 150, 'timezone': 'Asia/Jakarta'
            }
        )

        # --- USERS & EMPLOYEES ---
        # 1. Admin
        admin_user, _ = User.objects.get_or_create(email=admin_email, defaults={'is_active': True})
        admin_user.set_password('password123')
        admin_user.save()
        if not admin_user.tenants.filter(id=tenant.id).exists():
            admin_user.tenants.add(tenant)

        admin_emp, _ = Employee.objects.update_or_create(
            email=admin_user.email,
            defaults={
                'fullname': 'Admin One',
                'nik': f'ADM-{schema_name.upper()}',
                'ktp_number': f'12345678901234{schema_name[-1] if schema_name[-1].isdigit() else "0"}0',
                'department': dept_eng,
                'role': role_se,
                'golongan': gol_3a,
                'access_role': ar_admin,
                'branch': branch_jkt,
                'join_date': '2023-01-01'
            }
        )

        # 2. Manager
        mgr_user, _ = User.objects.get_or_create(email=f'manager1@{schema_name}.com', defaults={'is_active': True})
        mgr_user.set_password('password123')
        mgr_user.save()
        if not mgr_user.tenants.filter(id=tenant.id).exists():
            mgr_user.tenants.add(tenant)

        mgr_emp, _ = Employee.objects.update_or_create(
            email=mgr_user.email,
            defaults={
                'fullname': 'Manager One',
                'nik': 'MGR001',
                'ktp_number': f'12345678901234{schema_name[-1] if schema_name[-1].isdigit() else "0"}1',
                'department': dept_eng,
                'role': role_mgr,
                'golongan': gol_3a,
                'supervisor': admin_emp,
                'access_role': ar_mgr,
                'branch': branch_jkt,
                'join_date': '2023-01-01'
            }
        )

        # 3. Regular Employees (Default 5)
        employees = []
        for i in range(1, 6):
            emp_email = f'employee{i}@{schema_name}.com'
            u, _ = User.objects.get_or_create(email=emp_email, defaults={'is_active': True})
            u.set_password('password123')
            u.save()
            if not u.tenants.filter(id=tenant.id).exists():
                u.tenants.add(tenant)
                
            e, _ = Employee.objects.update_or_create(
                email=u.email,
                defaults={
                    'fullname': f'Employee {i}',
                    'nik': f'EMP{i:03d}',
                    'ktp_number': f'12345678901234{schema_name[-1] if schema_name[-1].isdigit() else "0"}{i+1}',
                    'department': dept_eng,
                    'role': role_se,
                    'golongan': gol_3a,
                    'supervisor': mgr_emp,
                    'branch': branch_jkt,
                    'join_date': '2023-01-01'
                }
            )
            employees.append(e)

        # --- WORKFLOWS & API KEYS ---
        WorkflowConfig.objects.get_or_create(model_type='LEAVE', defaults={'name': 'Leave Workflow', 'is_active': True})
        WorkflowConfig.objects.get_or_create(model_type='REIMBURSEMENT', defaults={'name': 'Reimbursement Workflow', 'is_active': True})
        
        APIKey.objects.update_or_create(
            label='ERP Sync',
            defaults={'is_active': True, 'key_prefix': 'erp_sync', 'key_hash': 'sha256$hashed$secret'}
        )

    return {
        'admin_emp': admin_emp,
        'mgr_emp': mgr_emp,
        'employees': employees
    }
