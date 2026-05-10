from unittest.mock import patch, MagicMock
from django_tenants.utils import schema_context
from django.urls import reverse
from django.conf import settings
from rest_framework import status
from rest_framework.test import APIClient
from users.models import User
from users.middleware import TenantAccessMiddleware
from tenants.models import Tenant, Domain
from core.models import Department, Role, Grade, Employee
from core.tests.base import HRMSTestCase as TenantTestCase

class UserModuleTestCase(TenantTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        # User who belongs ONLY to cls.tenant
        cls.tenant_user = User.objects.create_user(email='user@tenant.com', password='password')
        cls.tenant_user.tenants.add(cls.tenant)
        Employee.objects.create(email=cls.tenant_user.email, nik='T01', fullname='Tenant User', join_date='2024-01-01', ktp_number='K1234')
        
        cls.staff_user = User.objects.create_user(email='staff@platform.com', password='password', is_staff=True)

    def setUp(self):
        super().setUp()
        # Refresh shared objects to avoid cross-test contamination
        self.tenant_user.refresh_from_db()

    def test_user_creation_logic(self):
        """Verify model manager logic and string representation."""
        user = User.objects.create_user(email='new@test.com', password='password')
        self.assertEqual(user.email, 'new@test.com')
        self.assertEqual(str(user), 'new@test.com')

    def test_user_api_access(self):
        """Test UserViewSet list filtering."""
        url = reverse('user-list')
        
        # 1. Tenant User sees only themselves
        self.client.force_login(self.tenant_user)
        response = self.client.get(url, SERVER_NAME=str(self.domain))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Filters to own profile
        self.assertEqual(len(response.data), 1)

    def test_user_me_endpoint(self):
        """Verify that /api/users/me/ returns aggregated User + Employee data."""
        # 1. Setup HR data for this user in self.tenant
        dept = Department.objects.create(name="Engineering")
        role = Role.objects.create(name="Developer", department=dept)
        gol = Grade.objects.create(name="G2", base_salary=15000000)
        
        employee = Employee.objects.get(email=self.tenant_user.email)
        employee.nik = "DEV-001"
        employee.department = dept
        employee.role = role
        employee.grade = gol
        employee.join_date = "2024-01-01"
        employee.ktp_number = "123456789"
        employee.save()
        
        url = reverse('user-me')
        self.client.force_login(self.tenant_user)
        response = self.client.get(url, SERVER_NAME=str(self.domain))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 2. Check User fields
        self.assertEqual(response.data['email'], self.tenant_user.email)
        
        # 3. Check Employee fields (aggregated)
        self.assertEqual(response.data['employee_nik'], "DEV-001")
        self.assertEqual(response.data['role_name'], "Developer")
        self.assertEqual(response.data['department_name'], "Engineering")

    def test_user_me_unauthenticated(self):
        """Verify that /api/users/me/ returns 401/403 for unauthenticated users."""
        self.client.logout()
        url = reverse('user-me')
        response = self.client.get(url, SERVER_NAME=str(self.domain))
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_user_me_isolation(self):
        """Verify that the me endpoint doesn't return employee data from other tenants."""
        # This user belongs to self.tenant but NOT other_tenant
        with schema_context('public'):
            other_tenant = Tenant.objects.create(schema_name='iso_test', name='Isolation Co')
            other_domain = Domain.objects.create(domain=f'iso.{settings.TENANT_DOMAIN_SUFFIX}', tenant=other_tenant)
            
        # Create an employee in the OTHER tenant with the SAME email
        with schema_context('iso_test'):
            dept = Department.objects.create(name="Other Dept")
            Employee.objects.create(
                nik="OTHER-001",
                fullname="Imposter",
                email=self.tenant_user.email,
                department=dept,
                join_date="2024-01-01",
                ktp_number="999999"
            )

        url = reverse('user-me')
        self.client.force_login(self.tenant_user)
        
        # Requesting from self.tenant
        response = self.client.get(url, SERVER_NAME=str(self.domain))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return employee data from self.tenant (T01) and NOT from iso_test (OTHER-001)
        self.assertEqual(response.data.get('employee_nik'), 'T01')
        self.assertEqual(response.data['email'], self.tenant_user.email)

    def test_user_email_notification_toggle(self):
        """Verify that a user can toggle receive_email_notifications via the /api/users/<id>/ endpoint."""
        # 1. Default should be True
        self.assertTrue(self.tenant_user.receive_email_notifications)
        
        url = reverse('user-detail', kwargs={'pk': self.tenant_user.id})
        self.client.force_login(self.tenant_user)
        
        # 2. Update to False
        response = self.client.patch(url, {'receive_email_notifications': False}, format='json', SERVER_NAME=str(self.domain))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['receive_email_notifications'])
        
        # 3. Verify in DB
        self.tenant_user.refresh_from_db()
        self.assertFalse(self.tenant_user.receive_email_notifications)

class MiddlewareTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.middleware = TenantAccessMiddleware(get_response=MagicMock(return_value=MagicMock(status_code=200)))
        
        # Another tenant for testing
        with schema_context('public'):
            self.other_tenant = Tenant.objects.create(schema_name='other_test', name='Other Co')

    def create_mock_request(self, user, tenant):
        request = MagicMock()
        request.user = user
        request.tenant = tenant
        request.path = '/api/users/'
        # Mock session for logout
        request.session = {}
        # Ensure it has _messages for the messages framework
        request._messages = MagicMock()
        return request

    def test_middleware_allows_assigned_tenant(self):
        user = User.objects.create_user(email='assigned@test.com', password='password')
        user.tenants.add(self.tenant)
        
        request = self.create_mock_request(user, self.tenant)
        response = self.middleware(request)
        self.middleware.get_response.assert_called_with(request)

    @patch('users.middleware.logout')
    def test_middleware_denies_unassigned_tenant_api(self, mock_logout):
        """Verify 403 JsonResponse for API paths when tenant access is denied."""
        user = User.objects.create_user(email='denied_api@test.com', password='password')
        request = self.create_mock_request(user, self.tenant)
        request.path = '/api/some-endpoint/'
        
        response = self.middleware(request)
        
        self.assertEqual(response.status_code, 403)
        import json
        data = json.loads(response.content)
        self.assertIn('Akses ditolak', data['detail'])
        mock_logout.assert_not_called() # We return directly for API

    @patch('users.middleware.logout')
    @patch('users.middleware.redirect')
    def test_middleware_denies_unassigned_tenant_web(self, mock_redirect, mock_logout):
        """Verify 302 redirect for non-API paths when tenant access is denied."""
        user = User.objects.create_user(email='denied_web@test.com', password='password')
        request = self.create_mock_request(user, self.tenant)
        request.path = '/some-web-page/'
        
        self.middleware(request)
        
        mock_logout.assert_called_with(request)
        mock_redirect.assert_called()

    def test_middleware_allows_global_admin(self):
        admin = User.objects.create_user(email='global@test.com', password='password', is_global_admin=True)
        
        # Not assigned to self.tenant, but should be allowed
        request = self.create_mock_request(admin, self.tenant)
        response = self.middleware(request)
        self.middleware.get_response.assert_called_with(request)

from django.core.exceptions import ValidationError

class AdminSafeguardTestCase(TenantTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        # Tenant is already created as cls.tenant from TenantTestCase
        cls.admin = User.objects.create_user(email='admin_safeguard@test.com', password='password', is_staff=True, is_active=True)
        cls.admin.tenants.add(cls.tenant)

    def setUp(self):
        super().setUp()
        self.admin.refresh_from_db()
        
    def test_prevent_last_admin_demotion(self):
        """Verify the last admin cannot have is_staff set to False."""
        with schema_context(self.tenant.schema_name):
            self.admin.is_staff = False
            with self.assertRaisesMessage(ValidationError, "must have at least one active administrator"):
                self.admin.save()
            
    def test_prevent_last_admin_deactivation(self):
        """Verify the last admin cannot be deactivated."""
        with schema_context(self.tenant.schema_name):
            self.admin.is_active = False
            with self.assertRaisesMessage(ValidationError, "must have at least one active administrator"):
                self.admin.save()
            
    def test_prevent_last_admin_deletion(self):
        """Verify the last admin cannot be deleted."""
        with schema_context(self.tenant.schema_name):
            with self.assertRaisesMessage(ValidationError, "must have at least one active administrator"):
                self.admin.delete()
            
    def test_prevent_last_admin_m2m_removal(self):
        """Verify the last admin cannot be removed from their tenant mapping."""
        with schema_context(self.tenant.schema_name):
            with self.assertRaisesMessage(ValidationError, "They are the last active administrator"):
                self.admin.tenants.remove(self.tenant)
            
    def test_allow_demotion_if_other_admin_exists(self):
        """Verify an admin can be demoted if there is another active admin in the tenant."""
        second_admin = User.objects.create_user(email='admin2@test.com', password='password', is_staff=True, is_active=True)
        second_admin.tenants.add(self.tenant)
        
        # Now there are 2 admins. Demoting the first one should work.
        self.admin.is_staff = False
        self.admin.save()  # Should NOT raise ValidationError
        
        # Verify it actually saved
        self.admin.refresh_from_db()
        self.assertFalse(self.admin.is_staff)

    def test_max_admins_enforcement(self):
        """Verify that a user cannot be promoted to staff if max_admins is reached."""
        self.tenant.max_admins = 1
        self.tenant.save()
        
        # self.admin is already staff in self.tenant
        new_user = User.objects.create_user(email='new_admin@test.com', password='password')
        new_user.tenants.add(self.tenant)
        
        new_user.is_staff = True
        with self.assertRaisesMessage(ValidationError, "Batas maksimal administrator"):
            new_user.save()

    def test_max_admins_m2m_enforcement(self):
        """Verify that an admin user cannot be added to a tenant if max_admins is reached."""
        self.tenant.max_admins = 1
        self.tenant.save()
        
        # self.admin is already staff in self.tenant
        other_tenant_admin = User.objects.create_user(email='other_admin@test.com', password='password', is_staff=True)
        
        with self.assertRaisesMessage(ValidationError, "Batas maksimal administrator"):
            other_tenant_admin.tenants.add(self.tenant)

class UserAuthenticationTestCase(TenantTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.user_password = 'secure_password'
        cls.user = User.objects.create_user(email='auth_test@test.com', password=cls.user_password)
        cls.user.tenants.add(cls.tenant)

    def setUp(self):
        super().setUp()
        self.user.refresh_from_db()

    def test_login_success(self):
        """Verify authenticating via /api/auth/login/."""
        url = reverse('auth-login')
        payload = {'email': self.user.email, 'password': self.user_password}
        response = self.client.post(url, payload, format='json', SERVER_NAME=str(self.domain))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], self.user.email)

    def test_login_failure(self):
        """Verify 401 for wrong credentials."""
        url = reverse('auth-login')
        payload = {'email': self.user.email, 'password': 'wrong_password'}
        response = self.client.post(url, payload, format='json', SERVER_NAME=str(self.domain))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_refresh(self):
        """Verify token refresh via /api/auth/token/refresh/."""
        # 1. Get initial tokens
        login_url = reverse('auth-login')
        login_payload = {'email': self.user.email, 'password': self.user_password}
        login_response = self.client.post(login_url, login_payload, format='json', SERVER_NAME=str(self.domain))
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        refresh_token = login_response.data['refresh']
        
        # 2. Refresh
        refresh_url = reverse('token_refresh')
        refresh_payload = {'refresh': refresh_token}
        refresh_response = self.client.post(refresh_url, refresh_payload, format='json', SERVER_NAME=str(self.domain))
        
        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)
        self.assertIn('access', refresh_response.data)

class UserManagementTestCase(TenantTestCase):
    def test_email_normalization(self):
        """Verify UserManager normalizes email addresses."""
        user = User.objects.create_user(email='UPPERCASE@TEST.COM', password='password')
        self.assertEqual(user.email, 'uppercase@test.com')

    def test_staff_list_access(self):
        """Verify staff can see all users while regular users only see themselves."""
        domain = self.tenant.domains.first().domain
        
        staff = User.objects.create_user(email='staff_access@test.com', password='password', is_staff=True)
        staff.tenants.add(self.tenant)
        Employee.objects.create(email=staff.email, nik='S01', fullname='Staff User', join_date='2024-01-01', ktp_number='K9999')
        
        regular = User.objects.create_user(email='regular_access@test.com', password='password')
        regular.tenants.add(self.tenant)
        Employee.objects.create(email=regular.email, nik='R01', fullname='Regular User', join_date='2024-01-01', ktp_number='K5678')
        
        url = reverse('user-list')
        
        # 1. Staff sees all (including self.tenant's default admin if any)
        self.client.force_login(staff)
        response_staff = self.client.get(url, SERVER_NAME=str(domain))
        self.assertGreaterEqual(len(response_staff.data), 2)
        
        # 2. Regular sees only themselves
        self.client.force_login(regular)
        response_reg = self.client.get(url, SERVER_NAME=str(domain))
        self.assertEqual(len(response_reg.data), 1)
        self.assertEqual(response_reg.data[0]['email'], regular.email)

class AdminSafeguardExpansionTestCase(TenantTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        with schema_context('public'):
            cls.other_tenant = Tenant.objects.create(schema_name='other_safeguard', name='Other Safeguard Co')
            Domain.objects.create(domain=f'other.{settings.TENANT_DOMAIN_SUFFIX}', tenant=cls.other_tenant)
            
        cls.multi_admin = User.objects.create_user(email='multi_admin@test.com', password='password', is_staff=True)
        cls.multi_admin.tenants.add(cls.tenant, cls.other_tenant)

    def setUp(self):
        super().setUp()
        self.multi_admin.refresh_from_db()

    def test_prevent_last_admin_deletion_multitenant(self):
        """Verify a user who is the last admin in one tenant cannot be deleted."""
        # They are the last admin of self.tenant, but maybe not other_tenant
        # Deletion should still be blocked
        with schema_context(self.tenant.schema_name):
             with self.assertRaisesMessage(ValidationError, "The tenant"):
                self.multi_admin.delete()

    def test_max_admins_reverse_m2m(self):
        """Verify tenant.users.add() enforces max_admins limit."""
        self.tenant.max_admins = 1
        self.tenant.save()
        
        # One admin already exists? Wait, TenantTestCase might create one? 
        # No, but I added multi_admin in setUp.
        
        new_staff = User.objects.create_user(email='new_staff@test.com', password='password', is_staff=True)
        
        # Adding via reverse relationship
        with self.assertRaisesMessage(ValidationError, "Penambahan ini akan melebihi batas"):
            self.tenant.users.add(new_staff)
