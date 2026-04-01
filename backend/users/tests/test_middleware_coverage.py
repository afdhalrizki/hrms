from django.urls import reverse
from django_tenants.test.cases import TenantTestCase
from django_tenants.utils import schema_context
from rest_framework import status
from rest_framework.test import APIClient
from users.models import User
from tenants.models import Tenant, Domain

class MiddlewareCoverageTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        from tenants.models import Tenant, Domain
        from django_tenants.utils import schema_context
        
        with schema_context('public'):
            # Ensure public tenant exists
            self.public_tenant, _ = Tenant.objects.get_or_create(
                schema_name='public',
                name='Public Schema'
            )
            Domain.objects.get_or_create(
                domain='localhost',
                tenant=self.public_tenant,
                is_primary=True
            )
            self.public_domain = 'localhost'

        self.domain_name = 'middleware.localhost'
        Domain.objects.get_or_create(domain=self.domain_name, tenant=self.tenant, is_primary=True)

    def test_inactive_user_middleware(self):
        """Cover lines 17-24 in users/middleware.py."""
        self.user = User.objects.create_user(email='inactive@test.com', password='password', is_active=False)
        self.user.tenants.add(self.tenant)
        self.client.force_authenticate(user=self.user)
        
        # Test API path
        url = reverse('attendance-list')
        response = self.client.get(url, SERVER_NAME=self.domain_name)
        # It could be 403 (from middleware) or 401 (if logout triggers DRF unauthorized)
        assert response.status_code in [401, 403]

    def test_public_admin_restriction(self):
        """Cover lines 36-40 in users/middleware.py."""
        # Create a user that is NOT a global admin
        self.user = User.objects.create_user(email='not_global@test.com', password='password')
        self.client.force_login(self.user)
        
        # Accessing admin on public domain
        response = self.client.get('/admin/', SERVER_NAME=self.public_domain)
        self.assertEqual(response.status_code, 302) # Redirect to login
        self.assertTrue(response.url.startswith('/admin/login/'))

    def test_tenant_access_denied_api(self):
        """Cover lines 46-48 in users/middleware.py."""
        # Create a user NOT assigned to this tenant
        other_user = User.objects.create_user(email='other@test.com', password='password')
        # Do NOT add to self.tenant
        self.client.force_login(other_user)
        
        url = reverse('attendance-list')
        response = self.client.get(url, SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, 403)
        self.assertIn("Akses ditolak", response.json()['detail'])

    def test_subscription_suspended_blocking(self):
        """Cover lines 87-97 in SubscriptionMiddleware."""
        with schema_context('public'):
            self.tenant.subscription_status = 'SUSPENDED'
            self.tenant.save()
            
        self.user = User.objects.create_user(email='sub@test.com', password='password')
        self.user.tenants.add(self.tenant)
        self.client.force_authenticate(user=self.user)
        
        url = reverse('attendance-list')
        response = self.client.get(url, SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, 402)
        self.assertEqual(response.json()['code'], 'SUBSCRIPTION_SUSPENDED')

    def test_subscription_expired_readonly(self):
        """Cover lines 102-111 in SubscriptionMiddleware."""
        from datetime import date, timedelta
        with schema_context('public'):
            self.tenant.subscription_status = 'EXPIRED'
            self.tenant.expiry_date = date.today() - timedelta(days=1)
            self.tenant.save()
            
        self.user = User.objects.create_user(email='exp@test.com', password='password', is_staff=True)
        self.user.tenants.add(self.tenant)
        self.client.force_login(self.user)
        
        # GET should NOT be blocked by SubscriptionMiddleware (should NOT be 402)
        # It might be 401 or 403 if auth fails later, but we care about covering the middleware line 104
        url = reverse('attendance-list')
        response = self.client.get(url, SERVER_NAME=self.domain_name)
        self.assertNotEqual(response.status_code, 402)
        
        # POST should be blocked (402)
        response_post = self.client.post(url, {'date': '2026-01-01'}, format='json', SERVER_NAME=self.domain_name)
        self.assertEqual(response_post.status_code, 402)
        self.assertEqual(response_post.json()['code'], 'SUBSCRIPTION_EXPIRED_READ_ONLY')
