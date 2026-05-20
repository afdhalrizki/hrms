from django_tenants.test.cases import FastTenantTestCase
from rest_framework.test import APIClient
from users.models import User
from core.models import Department, Role, Grade, Employee, AccessRole, Branch
from decimal import Decimal
import os

# Determine worker ID to isolate schemas in parallel runs
WORKER_ID = os.environ.get('PYTEST_XDIST_WORKER', 'master')

class HRMSTestCase(FastTenantTestCase):
    """
    Base test case for HRMS that fixes issues with FastTenantTestCase
    and provides a standard APIClient.
    
    Isolation Strategy:
    1. Tenant Isolation: Each worker (gw0, gw1...) uses a unique schema name.
    2. Class Isolation: Data in the tenant schema is cleared in setUpClass.
    3. Public Schema Contention: sync_shared is disabled, and tenant-user 
       relationships are cleared in setUpClass.
    4. Quota Reset: employee_count and storage_used_bytes are reset in setUpClass
       since TRUNCATE doesn't trigger signals.
    """
    
    @classmethod
    def get_test_schema_name(cls):
        return f'fast_{WORKER_ID}'

    @classmethod
    def get_test_tenant_domain(cls):
        return f'fast-{WORKER_ID}.test.local'

    @classmethod
    def sync_shared(cls):
        """Skip shared sync to avoid race conditions in parallel runs."""
        pass

    @classmethod
    def use_existing_tenant(cls):
        """Ensure cls.domain is set even if the tenant already exists."""
        from django_tenants.utils import get_tenant_domain_model
        domain_model = get_tenant_domain_model()
        cls.domain_obj = domain_model.objects.filter(tenant=cls.tenant).first()
        if cls.domain_obj:
            cls.domain = cls.domain_obj.domain
        else:
            cls.domain = cls.get_test_tenant_domain()

    @classmethod
    def setup_tenant(cls, tenant):
        """Ensure tenant has required fields if django-tenants creates it."""
        from django_tenants.utils import schema_context
        with schema_context('public'):
            tenant.plan_type = 'ENTERPRISE'
            tenant.subscription_status = 'ACTIVE'
            tenant.save()

    @classmethod
    def setUpClass(cls):
        from django.db import connection
        # Call FastTenantTestCase.setUpClass
        super().setUpClass()
        
        if not hasattr(cls, 'domain') or cls.domain is None:
            cls.use_existing_tenant()
            
        if hasattr(cls, 'domain') and not isinstance(cls.domain, str) and cls.domain is not None:
            if hasattr(cls.domain, 'domain'):
                cls.domain = cls.domain.domain
            else:
                cls.domain = str(cls.domain)
        
        # Set connection to tenant schema
        connection.set_tenant(cls.tenant)
        
        # CLEAR TENANT DATA
        with connection.cursor() as cursor:
            cursor.execute(f"SET search_path TO {cls.get_test_schema_name()}")
            cursor.execute("""
                SELECT tablename FROM pg_tables 
                WHERE schemaname = %s
            """, [cls.get_test_schema_name()])
            tables = [row[0] for row in cursor.fetchall()]
            if tables:
                cursor.execute(f"TRUNCATE TABLE {', '.join(tables)} RESTART IDENTITY CASCADE")
        
        # CLEAR PUBLIC DATA RELATIONSHIPS & QUOTAS
        # Since TRUNCATE doesn't trigger post_delete signals, we must reset counters manually.
        cls.tenant.users.clear()
        cls.tenant.employee_count = 0
        cls.tenant.storage_used_bytes = 0
        cls.tenant.save(update_fields=['employee_count', 'storage_used_bytes'])

    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.worker_id = WORKER_ID
        
        # Reset tenant state per test to avoid pollution (e.g. from subscription tests)
        from django_tenants.utils import schema_context
        with schema_context('public'):
            self.tenant.subscription_status = 'ACTIVE'
            self.tenant.expiry_date = None
            self.tenant.employee_count = 0
            self.tenant.storage_used_bytes = 0
            self.tenant.save()

class BaseHRTestCase(HRMSTestCase):
    """
    Extends HRMSTestCase with common HR master data (Department, Role, Grade).
    """
    def setUp(self):
        super().setUp()
        
        # Use worker-specific email for the base admin
        admin_email = f'admin_{self.worker_id}@hrms-test.com'
        
        self.admin_user, created = User.objects.get_or_create(
            email=admin_email,
            defaults={'is_staff': True, 'is_active': True}
        )
        if created:
            self.admin_user.set_password('password')
            self.admin_user.save()
        
        self.admin_user.tenants.add(self.tenant)
        
        self.dept, _ = Department.objects.get_or_create(name="Default Dept")
        self.role, _ = Role.objects.get_or_create(name="Default Role", department=self.dept)
        self.gol, _ = Grade.objects.get_or_create(
            name="G1", 
            defaults={'base_salary': Decimal('10000000')}
        )
        
        self.admin_employee, _ = Employee.objects.get_or_create(
            email=self.admin_user.email,
            defaults={
                'nik': 'ADM-BASE',
                'fullname': 'Admin Base',
                'department': self.dept,
                'role': self.role,
                'grade': self.gol,
                'join_date': '2024-01-01',
                'ktp_number': 'KTP-BASE'
            }
        )
        
        self.admin_user.refresh_from_db()
        self.admin_employee.refresh_from_db()
