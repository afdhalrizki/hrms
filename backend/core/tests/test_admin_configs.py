from core.tests.base import HRMSTestCase as TenantTestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from core.models import APIKey, AuditLog, WorkflowConfig, AccessRole, Employee, Department, Role, Grade, Branch
from users.models import User
from decimal import Decimal
from django.utils import timezone

class AdminConfigsTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.domain = self.tenant.domains.first().domain

        # 1. Setup Roles
        self.admin_role = AccessRole.objects.create(
            name="Admin",
            permissions={
                'manage_settings': True, 
                'view_audit_logs': True,
                'manage_hr': True
            }
        )
        self.staff_role = AccessRole.objects.create(
            name="Staff",
            permissions={'manage_settings': False, 'view_audit_logs': False}
        )

        # 2. Setup Users
        self.user_admin = User.objects.create_user(email='admin@configs.com', password='password')
        self.user_admin.tenants.add(self.tenant)
        
        self.user_staff = User.objects.create_user(email='staff@configs.com', password='password')
        self.user_staff.tenants.add(self.tenant)

        # 3. Setup Employees (needed for HasRBACPermission)
        self.dept = Department.objects.create(name="HQ")
        self.branch = Branch.objects.create(
            name="HQ",
            latitude=Decimal("-6.2"),
            longitude=Decimal("106.8")
        )
        self.role = Role.objects.create(name="Mgr", department=self.dept)
        self.gol = Grade.objects.create(name="G1", base_salary=1000)

        Employee.objects.create(
            nik="ADM-01", fullname="Admin", email=self.user_admin.email,
            department=self.dept, role=self.role, grade=self.gol,
            access_role=self.admin_role, join_date="2024-01-01",
            ktp_number="ADM123"
        )
        Employee.objects.create(
            nik="STF-01", fullname="Staff", email=self.user_staff.email,
            department=self.dept, role=self.role, grade=self.gol,
            access_role=self.staff_role, join_date="2024-01-01",
            ktp_number="STF123"
        )

        # 4. Seed Configs
        self.api_key = APIKey.objects.create(
            label="Test Key",
            key_prefix="testpref",
            key_hash="hashed_secret"
        )
        self.audit_log = AuditLog.objects.create(
            action_type='UPDATE',
            model_name='Employee',
            object_id='1',
            changed_fields={'salary': {'old': 1000, 'new': 1200}},
            actor=self.user_admin
        )
        self.workflow = WorkflowConfig.objects.create(
            name="Leave Approval",
            model_type='LEAVE',
            is_active=True
        )

    def test_api_key_permissions(self):
        """Verify that only users with manage_settings can access API Keys."""
        url = reverse('apikey-list')
        
        # 1. Staff (Denied) - Should return 403
        self.client.force_authenticate(user=self.user_staff)
        response = self.client.get(url, SERVER_NAME=self.domain, secure=True)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # 2. Admin (Allowed)
        self.client.force_authenticate(user=self.user_admin)
        response = self.client.get(url, SERVER_NAME=self.domain, secure=True)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_audit_log_permissions(self):
        """Verify that only users with view_audit_logs can access Audit Logs."""
        url = reverse('auditlog-list')
        
        # 1. Staff (Denied) - AuditLogViewSet raises PermissionDenied (403) explicitly
        self.client.force_authenticate(user=self.user_staff)
        response = self.client.get(url, SERVER_NAME=self.domain, secure=True)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # 2. Admin (Allowed)
        self.client.force_authenticate(user=self.user_admin)
        response = self.client.get(url, SERVER_NAME=self.domain, secure=True)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_workflow_config_crud(self):
        """Verify CRUD operations for workflow configurations."""
        url = reverse('workflowconfig-list')
        
        # 1. List (Admin)
        self.client.force_authenticate(user=self.user_admin)
        response = self.client.get(url, SERVER_NAME=self.domain, secure=True)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        
        # 2. Create
        payload = {
            'name': 'Reimbursement Approval',
            'model_type': 'REIMBURSEMENT',
            'is_active': True
        }
        response = self.client.post(url, payload, format='json', SERVER_NAME=self.domain, secure=True)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(WorkflowConfig.objects.count(), 2)
        
        # 3. Staff (Denied)
        self.client.force_authenticate(user=self.user_staff)
        response = self.client.post(url, payload, format='json', SERVER_NAME=self.domain, secure=True)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
