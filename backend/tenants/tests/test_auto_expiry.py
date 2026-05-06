from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from django.contrib.auth import get_user_model
from tenants.models import RegistrationRequest, Tenant
from core.tests.base import BaseHRTestCase
from datetime import date, timedelta
from django_tenants.utils import schema_context

User = get_user_model()

class SubscriptionLifecycleTestCase(BaseHRTestCase):
    def setUp(self):
        super().setUp()
        # Global Admin for approval (admin@master.com is usually seeded)
        self.master_admin, _ = User.objects.get_or_create(
            email='master@platform.com',
            defaults={'is_superuser': True, 'is_staff': True}
        )
        self.master_admin.set_password('password123')
        self.master_admin.save()

    def test_automatic_expiry_date_on_approval(self):
        """Verify that a tenant gets an automatic 14-day expiry date upon approval."""
        self.client.force_authenticate(user=self.master_admin)
        registration = RegistrationRequest.objects.create(
            company_name='Expiry Test Corp',
            subdomain_prefix='expiry-auto-test',
            admin_email='admin@expirytest.com'
        )
        
        approve_url = reverse('internal-registration-approve', args=[registration.id])
        response = self.client.post(approve_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Fetch the newly created tenant
        tenant = Tenant.objects.get(name='Expiry Test Corp')
        expected_expiry = date.today() + timedelta(days=14)
        
        self.assertEqual(tenant.expiry_date, expected_expiry)
        # Status should be ACTIVE initially
        self.assertEqual(tenant.subscription_status, 'ACTIVE')

    def test_read_only_mode_during_grace_period(self):
        """Verify Read-Only mode when subscription is expired but within the grace period."""
        # Use the built-in self.tenant and self.admin_user from BaseHRTestCase
        with schema_context('public'):
            self.tenant.expiry_date = date.today() - timedelta(days=1)
            self.tenant.update_subscription_status() # Sync status to EXPIRED
            self.tenant.save()
        
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('department-list')
        
        # 1. GET (Read) should still be allowed (200 OK)
        response = self.client.get(url, HTTP_HOST=str(self.domain))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 2. POST (Write) should be blocked with 402 Payment Required
        response = self.client.post(url, {'name': 'New Dept'}, format='json', HTTP_HOST=str(self.domain))
        self.assertEqual(response.status_code, 402)
        # JsonResponse doesn't have .data, use .json()
        self.assertEqual(response.json()['code'], 'SUBSCRIPTION_EXPIRED_READ_ONLY')

    def test_total_block_after_grace_period(self):
        """Verify total blocking after the grace period ends."""
        # Setup tenant beyond grace period (expired 20 days ago)
        with schema_context('public'):
            self.tenant.expiry_date = date.today() - timedelta(days=20)
            self.tenant.update_subscription_status() # Sync status to SUSPENDED
            self.tenant.save()
        
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('department-list')
        
        # 1. GET should be blocked (402)
        response = self.client.get(url, HTTP_HOST=str(self.domain))
        self.assertEqual(response.status_code, 402)
        self.assertEqual(response.json()['code'], 'SUBSCRIPTION_SUSPENDED')
        
        # 2. POST should be blocked (402)
        response = self.client.post(url, {'name': 'New Dept'}, format='json', HTTP_HOST=str(self.domain))
        self.assertEqual(response.status_code, 402)
        self.assertEqual(response.json()['code'], 'SUBSCRIPTION_SUSPENDED')
