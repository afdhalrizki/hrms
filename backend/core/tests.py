from datetime import date
from django.urls import reverse
from django_tenants.test.cases import TenantTestCase
from django_tenants.utils import schema_context
from rest_framework import status
from rest_framework.test import APIClient
from core.models import Department, Role, Golongan, Employee
from users.models import User

class CoreModuleTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        
        with schema_context(self.tenant.schema_name):
            # 1. Setup Master Data
            self.dept = Department.objects.create(name='Human Resources', description='HR Department')
            self.role = Role.objects.create(name='Manager', department=self.dept)
            self.golongan = Golongan.objects.create(
                name='IIIA', 
                base_salary=5000000, 
                meal_allowance=25000, 
                transport_allowance=15000
            )
            
            # 2. Setup User & Employee
            self.user = User.objects.create_user(email='admin@company.com', password='password', is_staff=True)
            self.user.tenants.add(self.tenant)
            
            self.employee = Employee.objects.create(
                nik='EMP001',
                fullname='John Doe',
                email='john@company.com',
                department=self.dept,
                role=self.role,
                golongan=self.golongan,
                join_date=date.today(),
                ktp_number='1234567890123456',
                ptkp_status='TK/0'
            )
            
            # Domain for SERVER_NAME
            self.domain_name = self.tenant.domains.first().domain

    def test_department_api(self):
        """Test Department CRUD via API."""
        self.client.force_login(self.user)
        url = reverse('department-list')
        
        # List
        response = self.client.get(url, SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        
        # Create
        payload = {'name': 'IT', 'description': 'IT Department'}
        response = self.client.post(url, payload, format='json', SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Department.objects.count(), 2)

    def test_role_api(self):
        """Test Role relationships via API."""
        self.client.force_login(self.user)
        url = reverse('role-list')
        
        payload = {
            'name': 'Senior Developer',
            'department': self.dept.id,
            'description': 'Senior role'
        }
        response = self.client.post(url, payload, format='json', SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Role.objects.get(name='Senior Developer').department, self.dept)

    def test_golongan_api(self):
        """Test Golongan salary fields."""
        self.client.force_login(self.user)
        url = reverse('golongan-list')
        
        payload = {
            'name': 'IVB',
            'base_salary': '7500000.00',
            'meal_allowance': '30000.00',
            'transport_allowance': '20000.00'
        }
        response = self.client.post(url, payload, format='json', SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        gol = Golongan.objects.get(name='IVB')
        self.assertEqual(float(gol.base_salary), 7500000.0)

    def test_employee_api(self):
        """Test Employee creation and unique constraints."""
        self.client.force_login(self.user)
        url = reverse('employee-list')
        
        payload = {
            'nik': 'EMP002',
            'fullname': 'Jane Smith',
            'email': 'jane@company.com',
            'department': self.dept.id,
            'role': self.role.id,
            'golongan': self.golongan.id,
            'join_date': str(date.today()),
            'ktp_number': '0000000000000000',
            'ptkp_status': 'K/1'
        }
        response = self.client.post(url, payload, format='json', SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Test Duplicate NIK
        response = self.client.post(url, payload, format='json', SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_employee_provisioning_user(self):
        """Test that creating an employee with create_user=True provisions a User account."""
        self.client.force_login(self.user)
        url = reverse('employee-list')
        
        payload = {
            'nik': 'EMP003',
            'fullname': 'Provisioned User',
            'email': 'provisioned@company.com',
            'department': self.dept.id,
            'role': self.role.id,
            'golongan': self.golongan.id,
            'join_date': str(date.today()),
            'ktp_number': '1111111111111111',
            'ptkp_status': 'K/0',
            'create_user': True,
            'is_admin': True
        }
        
        from users.models import User as HRUser
        self.assertFalse(HRUser.objects.filter(email='provisioned@company.com').exists())
        
        response = self.client.post(url, payload, format='json', SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify User created
        new_user = HRUser.objects.get(email='provisioned@company.com')
        self.assertTrue(new_user.is_staff)
        self.assertTrue(new_user.tenants.filter(id=self.tenant.id).exists())

    def test_employee_detail_fields(self):
        """Ensure all fields are correctly saved and retrieved."""
        self.client.force_login(self.user)
        url = reverse('employee-detail', kwargs={'pk': self.employee.id})
        
        response = self.client.get(url, SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['nik'], 'EMP001')
        self.assertEqual(response.data['ptkp_status'], 'TK/0')

class BranchTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(email='admin_branch@test.com', password='password', is_staff=True)
        self.user.tenants.add(self.tenant)
        self.domain = self.tenant.domains.first().domain

    def test_branch_geofencing_defaults(self):
        """Verify branch creation and geofencing defaults."""
        from core.models import Branch
        branch = Branch.objects.create(
            name="Bandung Office",
            latitude=-6.9175,
            longitude=107.6191
        )
        self.assertEqual(branch.radius_meters, 100) # Default
        self.assertEqual(str(branch), "Bandung Office")

class RBACManagementTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        from core.models import AccessRole
        self.user = User.objects.create_user(email='rbac_admin@test.com', password='password', is_staff=True)
        self.user.tenants.add(self.tenant)
        self.domain = self.tenant.domains.first().domain
        self.role = AccessRole.objects.create(name="HR Specialist", permissions={"manage_hr": True}, is_default=True)

    def test_default_role_protection(self):
        """Verify that system default roles cannot be easily deleted if implemented (at least check the flag)."""
        self.assertTrue(self.role.is_default)
        self.assertEqual(str(self.role), "HR Specialist")

class InfrastructureTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(email='infra_admin@test.com', password='password', is_staff=True)
        self.user.tenants.add(self.tenant)
        self.domain = self.tenant.domains.first().domain

    def test_api_key_lifecycle(self):
        """Verify APIKey model fields."""
        from core.models import APIKey
        import uuid
        prefix = str(uuid.uuid4())[:8]
        key = APIKey.objects.create(
            label="Zapier Integration",
            key_prefix=prefix,
            key_hash="hashed_secret"
        )
        self.assertTrue(key.is_active)
        self.assertIn("Zapier", str(key))

    def test_system_notification_filtering(self):
        """Verify notification creation and filtering."""
        from core.models import SystemNotification
        SystemNotification.objects.create(title="Global Update", message="Upgrade soon", level='INFO')
        SystemNotification.objects.create(title="Private Alert", message="Check your salary", target_user=self.user)
        
        self.assertEqual(SystemNotification.objects.count(), 2)
        # Filter global only (no target_user)
        self.assertEqual(SystemNotification.objects.filter(target_user__isnull=True).count(), 1)

class AuditIntegrationTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.user = User.objects.create_user(email='audit_admin@test.com', password='password', is_staff=True)
        self.user.tenants.add(self.tenant)
        self.domain = self.tenant.domains.first().domain

    def test_audit_log_generation(self):
        """Verify that AuditModelMixin correctly generates logs for Master Data changes."""
        from core.models import AuditLog, Golongan
        self.client.force_login(self.user)
        url = reverse('golongan-list')
        
        # 1. CREATE should trigger log
        payload = {'name': 'AuditGrade', 'base_salary': '1000.00'}
        response = self.client.post(url, payload, format='json', SERVER_NAME=self.domain)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        gol_id = response.data['id']
        self.assertTrue(AuditLog.objects.filter(model_name='Golongan', action_type='CREATE', object_id=str(gol_id)).exists())
        
        # 2. UPDATE should trigger log with diff
        url_detail = reverse('golongan-detail', kwargs={'pk': gol_id})
        # Note: DecimalField might be stringified in the payload. 
        # AuditLogger compares model_to_dict values.
        payload_update = {'name': 'AuditGradeUpdated', 'base_salary': '2000.00'}
        response_patch = self.client.patch(url_detail, payload_update, format='json', SERVER_NAME=self.domain)
        self.assertEqual(response_patch.status_code, status.HTTP_200_OK)
        
        # Check AuditLog
        update_log = AuditLog.objects.filter(model_name='Golongan', action_type='UPDATE', object_id=str(gol_id)).first()
        self.assertIsNotNone(update_log, "AuditLog for UPDATE should exist")
        self.assertIn('name', update_log.changed_fields)
        self.assertEqual(update_log.changed_fields['name']['new'], 'AuditGradeUpdated')

class DataConstraintTestCase(TenantTestCase):
    def test_employee_ptkp_validation(self):
        """Verify PTKP status choices in Employee model."""
        from core.models import Employee, Department, Role, Golongan
        dept = Department.objects.create(name="D1")
        role = Role.objects.create(name="R1", department=dept)
        gol = Golongan.objects.create(name="G1", base_salary=1000)
        
        emp = Employee.objects.create(
            nik="VAL-001", fullname="Val Test", email="val@test.com",
            department=dept, role=role, golongan=gol,
            join_date=date.today(), ktp_number="VALKTP001",
            ptkp_status="K/2" # Valid Choice
        )
        self.assertEqual(emp.ptkp_status, "K/2")

class MultiTenancyIsolationTestCase(TenantTestCase):
    def test_schema_isolation(self):
        """Verify that data created in one tenant is not visible in another."""
        with schema_context(self.tenant.schema_name):
            Department.objects.create(name="Tenant Specific Dept")
            self.assertEqual(Department.objects.count(), 1)

        with schema_context('public'):
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT count(*) FROM information_schema.tables WHERE table_name = 'core_department' AND table_schema = 'public'")
                count = cursor.fetchone()[0]
                self.assertEqual(count, 0)
