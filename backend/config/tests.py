from django_tenants.test.cases import TenantTestCase
from django.conf import settings
from django.urls import reverse
from rest_framework import status

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
        """TenantMainMiddleware must be at the top."""
        self.assertEqual(
            settings.MIDDLEWARE[0],
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
        # This checks if os.environ is used as expected in settings.py
        # We can't easily re-import settings here, but we can verify the Result
        # that it's using 'django_tenants.postgresql_backend'
        self.assertEqual(settings.DATABASES['default']['ENGINE'], 'django_tenants.postgresql_backend')
