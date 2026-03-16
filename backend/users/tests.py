from unittest.mock import patch, MagicMock
from django_tenants.test.cases import TenantTestCase
from django_tenants.utils import schema_context
from django.urls import reverse
from django.conf import settings
from rest_framework import status
from rest_framework.test import APIClient
from users.models import User
from users.middleware import TenantAccessMiddleware
from tenants.models import Tenant, Domain

class UserModuleTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        
        # User who belongs ONLY to self.tenant
        self.tenant_user = User.objects.create_user(email='user@tenant.com', password='password')
        self.tenant_user.tenants.add(self.tenant)
        
        self.staff_user = User.objects.create_user(email='staff@platform.com', password='password', is_staff=True)
        self.domain = self.tenant.domains.first().domain

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
        response = self.client.get(url, SERVER_NAME=self.domain)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Filters to own profile
        self.assertEqual(len(response.data), 1)

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
    @patch('users.middleware.redirect')
    def test_middleware_denies_unassigned_tenant(self, mock_redirect, mock_logout):
        user = User.objects.create_user(email='denied@test.com', password='password')
        # User NOT in self.tenant
        
        request = self.create_mock_request(user, self.tenant)
        response = self.middleware(request)
        
        mock_logout.assert_called_with(request)
        mock_redirect.assert_called()

    def test_middleware_allows_global_admin(self):
        admin = User.objects.create_user(email='global@test.com', password='password', is_global_admin=True)
        
        # Not assigned to self.tenant, but should be allowed
        request = self.create_mock_request(admin, self.tenant)
        response = self.middleware(request)
        self.middleware.get_response.assert_called_with(request)
