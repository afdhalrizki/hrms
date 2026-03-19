from datetime import date, timedelta
from django.test import TestCase, Client
from django.conf import settings
from django.urls import reverse
from django.contrib.auth import get_user_model
from django_tenants.utils import schema_context
from django_tenants.test.cases import TenantTestCase
from tenants.models import Tenant, Domain
from core.models import Department

User = get_user_model()

class SubscriptionLogicTestCase(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(
            schema_name='sub_test',
            name='Subscription Test Corp'
        )

    def test_active_status(self):
        """Active if expiry_date is in the future."""
        self.tenant.expiry_date = date.today() + timedelta(days=30)
        self.tenant.save()
        self.tenant.update_subscription_status()
        self.assertEqual(self.tenant.subscription_status, 'ACTIVE')
        self.assertTrue(self.tenant.is_subscription_active)

    def test_expired_grace_period(self):
        """Expired if expiry_date is past but within grace period."""
        self.tenant.expiry_date = date.today() - timedelta(days=5)
        self.tenant.grace_period_days = 14
        self.tenant.save()
        self.tenant.update_subscription_status()
        self.assertEqual(self.tenant.subscription_status, 'EXPIRED')
        self.assertFalse(self.tenant.is_subscription_active)
        self.assertTrue(self.tenant.is_grace_period)

    def test_suspended_after_grace_period(self):
        """Suspended if expiry_date and grace period are both past."""
        self.tenant.expiry_date = date.today() - timedelta(days=20)
        self.tenant.grace_period_days = 14
        self.tenant.save()
        self.tenant.update_subscription_status()
        self.assertEqual(self.tenant.subscription_status, 'SUSPENDED')
        self.assertFalse(self.tenant.is_subscription_active)
        self.assertFalse(self.tenant.is_grace_period)

from rest_framework.test import APIClient

class SubscriptionMiddlewareTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.domain_name = self.tenant.domains.first().domain
        
        # Setup tenant
        self.tenant.name = 'Access Test Corp'
        self.tenant.expiry_date = date.today() + timedelta(days=30)
        self.tenant.save()
        
        # Create user
        self.user = User.objects.create_user(
            email='user@accesstest.com',
            password='password123'
        )
        self.user.tenants.add(self.tenant)
        self.client.force_login(self.user)

    def test_active_tenant_full_access(self):
        """Active tenant can perform POST requests."""
        with schema_context(self.tenant.schema_name):
            url = '/api/core/departments/' # Assuming this exists
            response = self.client.post(url, {'name': 'New Dept'}, format='json', SERVER_NAME=self.domain_name)
            # We don't care about success, just that it's not blocked by subscription
            self.assertNotEqual(response.status_code, 402)

    def test_expired_tenant_readonly(self):
        """Expired tenant (Grace Period) is Read-Only."""
        self.tenant.expiry_date = date.today() - timedelta(days=1)
        self.tenant.save()
        
        with schema_context(self.tenant.schema_name):
            url = '/api/core/departments/'
            # POST should be blocked
            response = self.client.post(url, {'name': 'Blocked Dept'}, format='json', SERVER_NAME=self.domain_name)
            self.assertEqual(response.status_code, 402)
            self.assertEqual(response.json()['code'], 'SUBSCRIPTION_EXPIRED_READ_ONLY')
            
            # GET should be allowed
            response = self.client.get(url, SERVER_NAME=self.domain_name)
            self.assertNotEqual(response.status_code, 402)

    def test_suspended_tenant_blocked(self):
        """Suspended tenant is fully blocked."""
        self.tenant.expiry_date = date.today() - timedelta(days=30)
        self.tenant.grace_period_days = 14
        self.tenant.save()
        
        with schema_context(self.tenant.schema_name):
            url = '/api/core/departments/'
            # Both GET and POST should be blocked
            response = self.client.get(url, SERVER_NAME=self.domain_name)
            self.assertEqual(response.status_code, 402)
            self.assertEqual(response.json()['code'], 'SUBSCRIPTION_SUSPENDED')
            
            response = self.client.post(url, {'name': 'Blocked Dept'}, format='json', SERVER_NAME=self.domain_name)
            self.assertEqual(response.status_code, 402)
