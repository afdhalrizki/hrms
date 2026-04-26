from core.tests.base import HRMSTestCase as TenantTestCase
from django.conf import settings
from django.urls import reverse
from django.core.cache import cache
from rest_framework import status
from tenants.models import Tenant

class ConfigSmokeTestCase(TenantTestCase):
    def test_multi_tenant_apps_configuration(self):
        """Verify that shared and tenant apps are correctly separated."""
        self.assertIn('django_tenants', settings.SHARED_APPS)
        self.assertIn('tenants', settings.SHARED_APPS)
        self.assertIn('core', settings.TENANT_APPS)
        self.assertIn('attendance', settings.TENANT_APPS)
        self.assertIn('payroll', settings.TENANT_APPS)
        
        # Ensure critical tenant apps are NOT in SHARED_APPS
        self.assertNotIn('core', settings.SHARED_APPS)
        self.assertNotIn('payroll', settings.SHARED_APPS)

    def test_middleware_order(self):
        """TenantMainMiddleware must be near the top, after ConnectionResetMiddleware if present."""
        first_middleware = settings.MIDDLEWARE[0]
        if first_middleware == 'users.conn_middleware.ConnectionResetMiddleware':
            self.assertEqual(
                settings.MIDDLEWARE[1],
                'django_tenants.middleware.main.TenantMainMiddleware'
            )
        else:
            self.assertEqual(
                first_middleware,
                'django_tenants.middleware.main.TenantMainMiddleware'
            )

    def test_auth_configuration(self):
        """Verify custom user model is set."""
        self.assertEqual(settings.AUTH_USER_MODEL, 'users.User')

    def test_database_router_configuration(self):
        """Verify tenant sync router is active."""
        self.assertIn('django_tenants.routers.TenantSyncRouter', settings.DATABASE_ROUTERS)

    def test_swagger_schema_endpoint(self):
        """Smoke test for API documentation route."""
        # Use the domain from the tenant automatically created by TenantTestCase
        domain = self.tenant.domains.first().domain
        url = reverse('schema')
        response = self.client.get(url, SERVER_NAME=domain)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_production_settings_logic(self):
        """Verify dynamic DB settings logic (fallback check)."""
        self.assertEqual(settings.DATABASES['default']['ENGINE'], 'django_tenants.postgresql_backend')

    def test_subscription_middleware_enforcement(self):
        """Verify that SubscriptionMiddleware blocks access for non-active tenants."""
        from datetime import date, timedelta
        import json
        domain = self.tenant.domains.first().domain
        url = reverse('schema')

        # 1. Test EXPIRED (Read-Only)
        self.tenant.expiry_date = date.today() - timedelta(days=1)
        self.tenant.subscription_status = 'EXPIRED'
        self.tenant.save()
        
        # GET should still work (Read Only)
        response = self.client.get(url, SERVER_NAME=domain)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # POST should fail with 402
        response_post = self.client.post(url, {}, SERVER_NAME=domain)
        self.assertEqual(response_post.status_code, 402)
        # JsonResponse has no .data, use .content
        self.assertIn('Read-Only', response_post.content.decode())

        # 2. Test SUSPENDED (Total Block)
        self.tenant.expiry_date = date.today() - timedelta(days=30)
        self.tenant.subscription_status = 'SUSPENDED'
        self.tenant.save()
        
        response_suspended = self.client.get(url, SERVER_NAME=domain)
        self.assertEqual(response_suspended.status_code, 402)
        self.assertIn('suspended', response_suspended.content.decode().lower())

    def test_cors_configuration_regex(self):
        """Verify that CORS regex matches intended origins."""
        import re
        regex = settings.CORS_ALLOWED_ORIGIN_REGEXES[0]
        self.assertTrue(re.match(regex, "http://tenant1.localhost:3000"))
        self.assertTrue(re.match(regex, "http://any-subdomain.localhost:3000"))
        self.assertFalse(re.match(regex, "http://evil.com"))

    def test_i18n_localization_middleware(self):
        """Verify LocaleMiddleware activation (Indonesian vs English)."""
        domain = self.tenant.domains.first().domain
        url = reverse('schema')
        
        # Request with ID locale
        response_id = self.client.get(url, SERVER_NAME=domain, HTTP_ACCEPT_LANGUAGE='id')
        self.assertEqual(response_id.status_code, status.HTTP_200_OK)
        self.assertIn('id', dict(settings.LANGUAGES))

    def test_cache_configuration(self):
        """Smoke test for cache connectivity (using LocMem for tests)."""
        from django.test import override_settings
        with override_settings(CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}):
            cache.set('config_test_key', 'passed', timeout=10)
            self.assertEqual(cache.get('config_test_key'), 'passed')

    def test_secure_headers(self):
        """Verify vital security headers are present in response."""
        domain = self.tenant.domains.first().domain
        url = reverse('schema')
        response = self.client.get(url, SERVER_NAME=domain)
        self.assertIn('X-Frame-Options', response.headers)
        self.assertEqual(response.headers['X-Frame-Options'], 'DENY')
        self.assertIn('X-Content-Type-Options', response.headers)
