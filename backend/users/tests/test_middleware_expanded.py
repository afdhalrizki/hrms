import json
from unittest.mock import Mock, patch
from django.test import RequestFactory, override_settings
from django.contrib.auth import get_user_model
from core.tests.base import HRMSTestCase as TenantTestCase
from users.middleware import SubscriptionMiddleware, TenantAccessMiddleware
from django.http import HttpResponse

User = get_user_model()

class MiddlewareExpandedTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.factory = RequestFactory()
        
        self.active_user = User.objects.create_user(email='active@test.com', password='pwd')
        self.active_user.tenants.add(self.tenant)
        self.active_user.is_active = True
        self.active_user.save()

        self.inactive_user = User.objects.create_user(email='inactive@test.com', password='pwd')
        self.inactive_user.tenants.add(self.tenant)
        self.inactive_user.is_active = False
        self.inactive_user.save()

        self.global_admin = User.objects.create_user(email='global@test.com', password='pwd', is_superuser=True)
        
        self.tenant_access_middleware = TenantAccessMiddleware(lambda r: HttpResponse("OK"))
        self.subscription_middleware = SubscriptionMiddleware(lambda r: HttpResponse("OK"))

    def test_tenant_access_inactive_user_web(self):
        request = self.factory.get('/some-web-page/')
        request.user = self.inactive_user
        request.tenant = self.tenant
        
        # We need mock messages framework and session for logout
        from django.contrib.messages.storage.fallback import FallbackStorage
        mock_session = Mock()
        setattr(request, 'session', mock_session)
        messages = FallbackStorage(request)
        setattr(request, '_messages', messages)

        response = self.tenant_access_middleware(request)
        self.assertEqual(response.status_code, 302) # Redirects to login

    def test_tenant_access_inactive_user_api(self):
        request = self.factory.get('/api/users/')
        request.user = self.inactive_user
        request.tenant = self.tenant
        
        mock_session = Mock()
        setattr(request, 'session', mock_session)
        
        response = self.tenant_access_middleware(request)
        self.assertEqual(response.status_code, 403)
        data = json.loads(response.content)
        self.assertEqual(data['detail'], "User account is inactive.")

    def test_tenant_access_public_admin_block(self):
        # Public schema trying to be accessed by non-global admin
        from tenants.models import Tenant
        public_tenant = Mock(spec=Tenant)
        public_tenant.schema_name = 'public'
        
        request = self.factory.get('/admin/login/')
        request.user = self.active_user
        request.tenant = public_tenant
        
        from django.contrib.messages.storage.fallback import FallbackStorage
        mock_session = Mock()
        setattr(request, 'session', mock_session)
        messages = FallbackStorage(request)
        setattr(request, '_messages', messages)

        response = self.tenant_access_middleware(request)
        self.assertEqual(response.status_code, 302)
        
    def test_tenant_access_unassigned_tenant_api(self):
        # Create user not assigned
        stranger = User.objects.create_user(email='stranger@test.com', password='pwd')
        
        request = self.factory.get('/api/users/')
        request.user = stranger
        request.tenant = self.tenant
        
        response = self.tenant_access_middleware(request)
        self.assertEqual(response.status_code, 403)

    def test_subscription_middleware_suspended_api(self):
        with patch('users.middleware.getattr') as mock_getattr:
            # We must mock carefully. Middlewares do getattr(request, 'tenant', None)
            # Instead, let's just use the actual tenant object but force it to look suspended
            pass
            
        self.tenant.subscription_status = 'SUSPENDED'
        self.tenant.save()
        
        request = self.factory.get('/api/do-something/')
        request.user = self.active_user
        request.tenant = self.tenant

        response = self.subscription_middleware(request)
        self.assertEqual(response.status_code, 402)
        data = json.loads(response.content)
        self.assertEqual(data['code'], "SUBSCRIPTION_SUSPENDED")

    def test_subscription_middleware_suspended_allows_billing(self):
        self.tenant.subscription_status = 'SUSPENDED'
        self.tenant.save()
        
        request = self.factory.get('/api/billing/invoices/')
        request.user = self.active_user
        request.tenant = self.tenant

        response = self.subscription_middleware(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"OK")

    def test_subscription_middleware_expired_read_only(self):
        self.tenant.subscription_status = 'EXPIRED'
        self.tenant.save()
        
        # GET should be allowed
        request_get = self.factory.get('/api/users/')
        request_get.user = self.active_user
        request_get.tenant = self.tenant
        
        response_get = self.subscription_middleware(request_get)
        self.assertEqual(response_get.status_code, 200)

        # POST should be blocked
        request_post = self.factory.post('/api/users/')
        request_post.user = self.active_user
        request_post.tenant = self.tenant
        
        response_post = self.subscription_middleware(request_post)
        self.assertEqual(response_post.status_code, 402)
        data = json.loads(response_post.content)
        self.assertEqual(data['code'], "SUBSCRIPTION_EXPIRED_READ_ONLY")

    def test_subscription_middleware_global_admin_bypass(self):
        self.tenant.subscription_status = 'SUSPENDED'
        self.tenant.save()
        
        request = self.factory.post('/api/users/')
        request.user = self.global_admin
        request.tenant = self.tenant

        response = self.subscription_middleware(request)
        self.assertEqual(response.status_code, 200)
