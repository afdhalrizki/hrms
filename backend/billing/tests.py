from rest_framework.test import APITestCase
from django.urls import reverse
from tenants.models import Tenant
from django.contrib.auth import get_user_model
from unittest.mock import patch
import time

User = get_user_model()

class BillingCheckoutTests(APITestCase):
    def setUp(self):
        # Create a tenant and a user in the public schema
        from django_tenants.utils import schema_context
        with schema_context('public'):
            self.tenant, _ = Tenant.objects.get_or_create(
                schema_name="test_billing",
                defaults={
                    'name': "Test Tenant",
                    'plan_type': 'PROFESSIONAL',
                    'employee_count': 0
                }
            )
            # Ensure it's fresh for each test if using get_or_create
            self.tenant.employee_count = 0
            self.tenant.storage_used_bytes = 0
            self.tenant.save()

        self.user = User.objects.create_user(
            email=f"admin_{int(time.time())}@test.com", 
            password="password123",
            is_staff=True
        )
        self.client.force_authenticate(user=self.user)
        
        # We need to ensure the request has the tenant attribute
        # In a real request, the middleware does this.
        # For testing, we can use a mock or ensure the context is correct.

    def test_checkout_downgrade_validation_failure(self):
        """
        Test that downgrading to a plan with lower capacity than current employee count fails.
        """
        from django_tenants.utils import schema_context
        with schema_context('public'):
            # Set current employee count to 80 (Above Essential limit of 50)
            self.tenant.employee_count = 80
            self.tenant.plan_type = 'PROFESSIONAL'
            self.tenant.save()

        url = reverse('billing-checkout')
        data = {
            'plan_type': 'ESSENTIAL',
            'months': 1
        }
        
        # Patch the tenant on the request because the middleware won't run in this simple test setup
        with patch('rest_framework.request.Request.tenant', self.tenant, create=True):
            # Also patch the view's request.tenant directly if needed, 
            # but usually setting it on the connection or mocking the attribute works.
            with patch('billing.views.BillingViewSet.get_permissions', return_value=[]): # Skip permissions if needed
                response = self.client.post(url, data, format='json')
                
                # If the above patch didn't work, we might need a more robust way to inject tenant
                # Let's try to mock the tenant property on the request object
                
        # Re-try with a more direct approach if the previous one is tricky in DRF tests
        from billing.views import BillingViewSet
        from rest_framework.test import APIRequestFactory
        
        factory = APIRequestFactory()
        request = factory.post(url, data, format='json')
        request.tenant = self.tenant
        request.user = self.user
        
        view = BillingViewSet.as_view({'post': 'checkout'})
        response = view(request)
        
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['code'], 'QUOTA_EXCEEDED')
        self.assertIn("melebihi kapasitas total (25)", response.data['error'])

    def test_checkout_storage_quota_does_not_block_downgrade(self):
        """
        Test that downgrading is NOT blocked even if current storage exceeds target plan capacity.
        """
        from django_tenants.utils import schema_context
        with schema_context('public'):
            # Set current storage to 500MB (Above Essential limit of 250MB)
            self.tenant.storage_used_bytes = 500 * 1024 * 1024
            self.tenant.save()

        url = reverse('billing-checkout')
        data = {
            'plan_type': 'ESSENTIAL',
            'months': 1
        }
        
        from billing.views import BillingViewSet
        from rest_framework.test import APIRequestFactory
        
        factory = APIRequestFactory()
        request = factory.post(url, data, format='json')
        request.tenant = self.tenant
        request.user = self.user
        
        with patch('billing.services.MidtransService.create_transaction') as mock_midtrans:
            mock_midtrans.return_value = {'token': 'storage-token'}
            
            view = BillingViewSet.as_view({'post': 'checkout'})
            response = view(request)
            
            # Should succeed because storage doesn't block downgrades
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data['snap_token'], 'storage-token')

    def test_checkout_upgrade_success(self):
        """
        Test that upgrading to a higher plan succeeds.
        """
        from django_tenants.utils import schema_context
        with schema_context('public'):
            self.tenant.employee_count = 20
            self.tenant.plan_type = 'ESSENTIAL'
            self.tenant.save()

        url = reverse('billing-checkout')
        data = {
            'plan_type': 'PROFESSIONAL',
            'months': 1
        }
        
        from billing.views import BillingViewSet
        from rest_framework.test import APIRequestFactory
        
        factory = APIRequestFactory()
        request = factory.post(url, data, format='json')
        request.tenant = self.tenant
        request.user = self.user
        
        with patch('billing.services.MidtransService.create_transaction') as mock_midtrans:
            mock_midtrans.return_value = {'token': 'fake-token'}
            
            view = BillingViewSet.as_view({'post': 'checkout'})
            response = view(request)
            
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data['snap_token'], 'fake-token')
    def test_checkout_downgrade_with_addon_success(self):
        """
        Test that downgrading to a plan with lower capacity SUCCEEDS if extra blocks are purchased.
        """
        from django_tenants.utils import schema_context
        with schema_context('public'):
            # Current: 30 employees (Plan: PROFESSIONAL, limit 100)
            self.tenant.employee_count = 30
            self.tenant.plan_type = 'PROFESSIONAL'
            self.tenant.save()

        # Target: ESSENTIAL (limit 25) + 10 Addon -> Should pass (Total 35)
        url = reverse('billing-checkout')
        data = {
            'plan_type': 'ESSENTIAL',
            'months': 1,
            'addon_count': 10
        }
        
        from billing.views import BillingViewSet
        from rest_framework.test import APIRequestFactory
        
        factory = APIRequestFactory()
        request = factory.post(url, data, format='json')
        request.tenant = self.tenant
        request.user = self.user
        
        with patch('billing.services.MidtransService.create_transaction') as mock_midtrans:
            mock_midtrans.return_value = {'token': 'bundle-token'}
            
            view = BillingViewSet.as_view({'post': 'checkout'})
            response = view(request)
            
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data['snap_token'], 'bundle-token')

    def test_webhook_bundled_processing(self):
        """
        Verify that the webhook processes both plan changes and addons in one go.
        """
        from billing.models import SubscriptionInvoice
        from django.utils import timezone
        
        # Create a PENDING bundled invoice
        invoice = SubscriptionInvoice.objects.create(
            tenant=self.tenant,
            amount=500000,
            plan_type='ESSENTIAL',
            midtrans_order_id='BUNDLE-123',
            months_added=1,
            addon_count=20,
            status='PENDING'
        )
        
        url = reverse('billing-webhook')
        data = {
            'order_id': 'BUNDLE-123',
            'status_code': '200',
            'gross_amount': '500000.00',
            'transaction_status': 'settlement',
            'signature_key': 'fake-sig'
        }
        
        from billing.views import BillingViewSet
        from rest_framework.test import APIRequestFactory
        
        factory = APIRequestFactory()
        request = factory.post(url, data, format='json')
        
        with patch('billing.services.MidtransService.verify_webhook_signature', return_value=True):
            view = BillingViewSet.as_view({'post': 'webhook'})
            response = view(request)
            
            self.assertEqual(response.status_code, 200)
            
            # Refresh tenant
            self.tenant.refresh_from_db()
            self.assertEqual(self.tenant.plan_type, 'ESSENTIAL')
            self.assertEqual(self.tenant.extra_employees, 20)
            self.assertEqual(self.tenant.subscription_status, 'ACTIVE')

    def test_checkout_addon_per_5_blocks(self):
        """
        Test that employee addons must be purchased in blocks of 5.
        """
        from django_tenants.utils import schema_context
        with schema_context('public'):
            self.tenant.plan_type = 'ESSENTIAL'
            self.tenant.save()

        url = reverse('billing-checkout')
        
        # Case 1: Valid addon of 5 employees (should pass)
        data_valid = {
            'plan_type': 'ESSENTIAL',
            'is_addon': True,
            'addon_count': 5
        }
        
        from billing.views import BillingViewSet
        from rest_framework.test import APIRequestFactory
        
        factory = APIRequestFactory()
        request = factory.post(url, data_valid, format='json')
        request.tenant = self.tenant
        request.user = self.user
        
        with patch('billing.services.MidtransService.create_transaction') as mock_midtrans:
            mock_midtrans.return_value = {'token': 'addon-5-token'}
            view = BillingViewSet.as_view({'post': 'checkout'})
            response = view(request)
            
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data['snap_token'], 'addon-5-token')
            
        # Case 2: Invalid addon of 7 employees (should fail validation)
        data_invalid = {
            'plan_type': 'ESSENTIAL',
            'is_addon': True,
            'addon_count': 7
        }
        
        request_invalid = factory.post(url, data_invalid, format='json')
        request_invalid.tenant = self.tenant
        request_invalid.user = self.user
        
        response_invalid = view(request_invalid)
        self.assertEqual(response_invalid.status_code, 400)
        self.assertIn("must be purchased in blocks of 5", response_invalid.data['error'])
