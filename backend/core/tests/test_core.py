from datetime import date
from django.urls import reverse
from django_tenants.utils import schema_context
from rest_framework import status
from core.models import Department, Role, Grade, Employee, Branch, AccessRole, APIKey, AuditLog
from users.models import User
from core.tests.base import HRMSTestCase, BaseHRTestCase

class CoreModuleTestCase(BaseHRTestCase):
    def setUp(self):
        super().setUp()
        self.user = self.admin_user
        self.employee = self.admin_employee
        # BaseHRTestCase uses self.gol, test_core uses self.grade
        self.grade = self.gol

    def test_department_api(self):
        """Test Department CRUD via API."""
        self.client.force_login(self.user)
        url = reverse('department-list')
        
        # List
        response = self.client.get(url, SERVER_NAME=str(self.domain))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
        
        # Create
        payload = {'name': 'IT', 'description': 'IT Department'}
        response = self.client.post(url, payload, format='json', SERVER_NAME=str(self.domain))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertGreaterEqual(Department.objects.count(), 2)

    def test_role_api(self):
        """Test Role relationships via API."""
        self.client.force_login(self.user)
        url = reverse('role-list')
        
        payload = {
            'name': 'Senior Developer',
            'department': self.dept.id,
            'description': 'Senior role'
        }
        response = self.client.post(url, payload, format='json', SERVER_NAME=str(self.domain))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Role.objects.get(name='Senior Developer').department, self.dept)

    def test_grade_api(self):
        """Test Grade salary fields."""
        self.client.force_login(self.user)
        url = reverse('grade-list')
        
        payload = {
            'name': 'IVB',
            'base_salary': '7500000.00',
            'meal_allowance': '30000.00',
            'transport_allowance': '20000.00'
        }
        response = self.client.post(url, payload, format='json', SERVER_NAME=str(self.domain))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        gol = Grade.objects.get(name='IVB')
        self.assertEqual(float(gol.base_salary), 7500000.0)

    def test_employee_api(self):
        """Test Employee creation and unique constraints."""
        self.client.force_login(self.user)
        url = reverse('employee-list')
        
        payload = {
            'nik': 'EMP002',
            'fullname': 'Jane Smith',
            'email': 'jane@company.com',
            'phone': '08123456789',
            'address': 'Jl. Keadilan No. 70',
            'department': self.dept.id,
            'role': self.role.id,
            'grade': self.grade.id,
            'join_date': str(date.today()),
            'ktp_number': '0000000000000000',
            'npwp_number': 'NPWP002',
            'ptkp_status': 'K/1'
        }
        response = self.client.post(url, payload, format='json', SERVER_NAME=str(self.domain))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Test Duplicate NIK
        response = self.client.post(url, payload, format='json', SERVER_NAME=str(self.domain))
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
            'grade': self.grade.id,
            'join_date': str(date.today()),
            'ktp_number': '1111111111111111',
            'ptkp_status': 'K/0',
            'create_user': True,
            'is_admin': True
        }
        
        from users.models import User as HRUser
        self.assertFalse(HRUser.objects.filter(email='provisioned@company.com').exists())
        
        response = self.client.post(url, payload, format='json', SERVER_NAME=str(self.domain))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify User created
        new_user = HRUser.objects.get(email='provisioned@company.com')
        self.assertTrue(new_user.is_staff)
        self.assertTrue(new_user.tenants.filter(id=self.tenant.id).exists())

    def test_employee_detail_fields(self):
        """Ensure all fields are correctly saved and retrieved."""
        self.client.force_login(self.user)
        url = reverse('employee-detail', kwargs={'pk': self.employee.id})
        
        response = self.client.get(url, SERVER_NAME=str(self.domain))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['nik'], self.admin_employee.nik)
        self.assertEqual(response.data['ptkp_status'], 'TK/0')
        # Check newly added fields
        self.assertIn('address', response.data)
        self.assertIn('npwp_number', response.data)

    def test_employee_termination_system_access(self):
        """Verify that terminatng an employee (or setting to a restricted status) blocks API access."""
        # Add a second admin to allow deactivating self.user without triggering Admin Safeguard
        with schema_context(self.tenant.schema_name):
            User.objects.create_user(email='dummy_admin@company.com', password='password', is_staff=True).tenants.add(self.tenant)

        # Auth should fail for inactive users
        with schema_context(self.tenant.schema_name):
            self.user.is_active = False
            self.user.save()
        
        self.client.force_login(self.user)
        response = self.client.get(reverse('employee-list'), SERVER_NAME=str(self.domain))
        # Auth should fail for inactive users (401 for JWT, 403 for some session/permission configs)
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

class BranchTestCase(HRMSTestCase):
    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(email='admin_branch@test.com', password='password', is_staff=True)
        self.user.tenants.add(self.tenant)

        with schema_context(self.tenant.schema_name):
            # Create Employee record for isolation check
            Employee.objects.create(
                nik='BR001', fullname='Branch Admin', email='admin_branch@test.com',
                join_date=date(2025, 1, 1), ktp_number='BR123'
            )

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

class RBACManagementTestCase(HRMSTestCase):
    def setUp(self):
        super().setUp()
        from core.models import AccessRole
        self.user = User.objects.create_user(email='rbac_admin@test.com', password='password', is_staff=True)
        self.user.tenants.add(self.tenant)
        
        with schema_context(self.tenant.schema_name):
            Employee.objects.create(
                nik='RBAC001', fullname='RBAC Admin', email='rbac_admin@test.com',
                join_date=date(2025,1,1), ktp_number='RBAC123'
            )
        
        self.role = AccessRole.objects.create(name="HR Specialist", permissions={"manage_hr": True}, is_default=True)

    def test_default_role_protection(self):
        """Verify that system default roles cannot be easily deleted if implemented (at least check the flag)."""
        self.assertTrue(self.role.is_default)
        self.assertEqual(str(self.role), "HR Specialist")

    def test_access_role_permissions_schema_validation(self):
        """Verify that AccessRole permissions can store and retrieve JSON correctly."""
        from core.models import AccessRole
        role = AccessRole.objects.create(
            name="Test Role",
            permissions={"manage_something": True, "nested": {"key": "val"}}
        )
        self.assertEqual(role.permissions['manage_something'], True)
        self.assertEqual(role.permissions['nested']['key'], 'val')

class InfrastructureTestCase(HRMSTestCase):
    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(email='infra_admin@test.com', password='password', is_staff=True)
        self.user.tenants.add(self.tenant)
        
        with schema_context(self.tenant.schema_name):
            Employee.objects.create(
                nik='INFRA001', fullname='Infra Admin', email='infra_admin@test.com',
                join_date=date(2025,1,1), ktp_number='INFRA123'
            )

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
        from notifications.models import SystemNotification
        SystemNotification.objects.create(title="Global Update", message="Upgrade soon", level='INFO')
        SystemNotification.objects.create(title="Private Alert", message="Check your salary", target_user=self.user)
        
        self.assertEqual(SystemNotification.objects.count(), 2)
        # Filter global only (no target_user)
        self.assertEqual(SystemNotification.objects.filter(target_user__isnull=True).count(), 1)

class AuditIntegrationTestCase(HRMSTestCase):
    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(email='audit_admin@test.com', password='password', is_staff=True)
        self.user.tenants.add(self.tenant)
        
        with schema_context(self.tenant.schema_name):
            Employee.objects.create(
                nik='AUDIT001', fullname='Audit Admin', email='audit_admin@test.com',
                join_date=date(2025,1,1), ktp_number='AUDIT123'
            )

    def test_audit_log_generation(self):
        """Verify that AuditModelMixin correctly generates logs for Master Data changes."""
        from core.models import AuditLog, Grade
        self.client.force_login(self.user)
        url = reverse('grade-list')
        
        # 1. CREATE should trigger log
        payload = {'name': 'AuditGrade', 'base_salary': '1000.00'}
        response = self.client.post(url, payload, format='json', SERVER_NAME=str(self.domain))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        gol_id = response.data['id']
        self.assertTrue(AuditLog.objects.filter(model_name='Grade', action_type='CREATE', object_id=str(gol_id)).exists())
        
        # 2. UPDATE should trigger log with diff
        url_detail = reverse('grade-detail', kwargs={'pk': gol_id})
        # Note: DecimalField might be stringified in the payload. 
        # AuditLogger compares model_to_dict values.
        payload_update = {'name': 'AuditGradeUpdated', 'base_salary': '2000.00'}
        response_patch = self.client.patch(url_detail, payload_update, format='json', SERVER_NAME=str(self.domain))
        self.assertEqual(response_patch.status_code, status.HTTP_200_OK)
        
        # Check AuditLog
        update_log = AuditLog.objects.filter(model_name='Grade', action_type='UPDATE', object_id=str(gol_id)).first()
        self.assertIsNotNone(update_log, "AuditLog for UPDATE should exist")
        self.assertIn('name', update_log.changed_fields)
        self.assertEqual(update_log.changed_fields['name']['new'], 'AuditGradeUpdated')

    def test_audit_log_api_listing(self):
        """Verify that admins can list audit logs via API."""
        from core.models import AuditLog
        with schema_context(self.tenant.schema_name):
            AuditLog.objects.create(
                model_name='TestModel',
                object_id='1',
                action_type='CREATE',
                actor=self.user,
                changed_fields={'test': {'new': True}}
            )
        
        self.client.force_login(self.user)
        url = reverse('auditlog-list')
        response = self.client.get(url, SERVER_NAME=str(self.domain))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['model_name'], 'TestModel')

class DataConstraintTestCase(HRMSTestCase):
    def test_employee_ptkp_validation(self):
        """Verify PTKP status choices in Employee model."""
        from core.models import Employee, Department, Role, Grade
        dept = Department.objects.create(name="D1")
        role = Role.objects.create(name="R1", department=dept)
        gol, _ = Grade.objects.get_or_create(name="G1_VAL", defaults={"base_salary": 1000})
        
        emp = Employee.objects.create(
            nik="VAL-PTKP-UNIQUE", fullname="Val Test", email="val_ptkp@test.com",
            department=dept, role=role, grade=gol,
            join_date=date.today(), ktp_number="VALKTP-UNIQUE",
            ptkp_status="K/2" # Valid Choice
        )
        self.assertEqual(emp.ptkp_status, "K/2")

class MultiTenancyIsolationTestCase(HRMSTestCase):
    def test_schema_isolation(self):
        """Verify that data created in one tenant is not visible in another."""
        with schema_context(self.tenant.schema_name):
            Department.objects.create(name="Tenant Specific Dept")
            # BaseHRTestCase might have created others
            self.assertGreaterEqual(Department.objects.count(), 1)

        with schema_context('public'):
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT count(*) FROM information_schema.tables WHERE table_name = 'core_department' AND table_schema = 'public'")
                count = cursor.fetchone()[0]
                self.assertEqual(count, 0)

    def test_cross_tenant_api_isolation(self):
        """Hardening: Ensure Tenant B cannot see Tenant A's data even if authenticated (schema mismatch)."""
        from django_tenants.utils import get_tenant_model
        TenantModel = get_tenant_model()
        
        # 1. Create Tenant B with UNIQUE schema
        import uuid
        unique_b = f"tb{uuid.uuid4().hex[:6]}"
        with schema_context('public'):
            tenant_b = TenantModel.objects.create(schema_name=unique_b, name='Tenant B Isolation')
            from django_tenants.utils import get_tenant_domain_model
            get_tenant_domain_model().objects.create(domain=f'{unique_b}.localhost', tenant=tenant_b, is_primary=True)
        
        # 2. Create data in Tenant A (already done in setUp if we use a new test case, but let's be explicit)
        with schema_context(self.tenant.schema_name):
            dept_a = Department.objects.create(name="Dept A Only")
            user_a = User.objects.create_user(email='user_a@test.com', password='password', is_staff=True)
            user_a.tenants.add(self.tenant)
            domain_a = self.tenant.domains.first().domain

        # 3. Create user in Tenant B
        with schema_context(tenant_b.schema_name):
            user_b = User.objects.create_user(email='user_b@test.com', password='password', is_staff=True)
            user_b.tenants.add(tenant_b)
            # Dept in B with same name to test if they are distinct
            Department.objects.create(name="Dept B Only")

        self.client.force_login(user_b)
        
        # 4. Attempt to access Tenant A's domain with Tenant B's credentials
        # Most multi-tenant setups will block this via Middleware (403 or 404 because user is not in tenant)
        url = reverse('department-list')
        response = self.client.get(url, SERVER_NAME=domain_a)
        
        # Expected: Forbidden because user_b doesn't belong to tenant_a
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # 5. Verify query isolation via schema_context
        with schema_context(tenant_b.schema_name):
            qs = Department.objects.all()
            self.assertGreaterEqual(qs.count(), 1)
            self.assertEqual(qs.first().name, "Dept B Only")
            self.assertFalse(qs.filter(name="Dept A Only").exists())
