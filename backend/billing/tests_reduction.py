from django_tenants.test.cases import FastTenantTestCase as TenantTestCase
from billing.models import QuotaReductionRequest, SubscriptionInvoice
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from django.urls import reverse
import hashlib
from django.conf import settings

User = get_user_model()

class QuotaReductionTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        # TenantTestCase creates self.tenant
        self.tenant.extra_storage_mb = 5 * 1024 # 5GB extra (5120 MB)
        self.tenant.save()
        # 2. Setup Users
        self.admin_user = User.objects.create_user(email='admin@test.com', password='password')
        self.admin_user.tenants.add(self.tenant)
        
        self.super_user = User.objects.create_superuser(email='super@admin.com', password='password')
        # Needed because QuotaReductionRequestViewSet checks request.tenant
        
        self.client = APIClient()

    def test_reduction_request_validation(self):
        """Should fail if reduction > extra_storage_mb."""
        self.client.force_authenticate(user=self.admin_user)
        
        url = reverse('quota-reduction-list')
        payload = {
            'tenant': self.tenant.id,
            'requested_gb_reduction': 6, # More than 5GB available
            'reason': 'Too much space'
        }
        
        domain = self.tenant.domains.first().domain
        response = self.client.post(url, payload, format='json', SERVER_NAME=domain)
        if response.status_code == 301:
            print(f"DEBUG: Redirected from {url} to {response['Location']}")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Cannot reduce by 6GB', str(response.data))

    def test_successful_reduction_workflow(self):
        """Request -> Approval -> Storage Reduced."""
        # 1. Create Request
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('quota-reduction-list')
        domain = self.tenant.domains.first().domain
        res_create = self.client.post(url, {
            'tenant': self.tenant.id,
            'requested_gb_reduction': 2, 
            'reason': 'Cost saving'
        }, format='json', SERVER_NAME=domain)
        self.assertEqual(res_create.status_code, status.HTTP_201_CREATED)
        request_id = res_create.data['id']
        
        # 2. Approve by Super Admin
        self.client.force_authenticate(user=self.super_user)
        detail_url = reverse('quota-reduction-detail', kwargs={'pk': request_id})
        domain = self.tenant.domains.first().domain
        res_approve = self.client.patch(detail_url, {
            'status': 'APPROVED', 
            'admin_note': 'Approved per request'
        }, format='json', SERVER_NAME=domain)
        self.assertEqual(res_approve.status_code, status.HTTP_200_OK)
        
        # 3. Verify Tenant Storage in DB
        self.tenant.refresh_from_db()
        # 5GB (5120MB) - 2GB (2048MB) = 3GB (3072MB)
        self.assertEqual(self.tenant.extra_storage_mb, 3072)

    def test_auto_cancellation_on_top_up(self):
        """PENDING reduction requests should be cancelled if storage is bought."""
        # 1. Create PENDING request
        req = QuotaReductionRequest.objects.create(
            tenant=self.tenant,
            requested_gb_reduction=1,
            reason='Need less'
        )
        
        # 2. Simulate storage purchase (via webhook)
        server_key = getattr(settings, 'MIDTRANS_SERVER_KEY', 'SB-Mid-server-placeholder')
        order_id = "SUB-TOPUP-1"
        invoice = SubscriptionInvoice.objects.create(
            tenant=self.tenant,
            amount=50000,
            plan_type='ADDON',
            midtrans_order_id=order_id,
            is_storage_addon=True,
            storage_gb_count=1
        )
        
        # Signature calculation
        payload = f"{order_id}20050000.00{server_key}"
        signature = hashlib.sha512(payload.encode()).hexdigest()
        
        webhook_data = {
            "order_id": order_id,
            "status_code": "200",
            "gross_amount": "50000.00",
            "signature_key": signature,
            "transaction_status": "settlement",
            "payment_type": "credit_card"
        }
        
        url = reverse('billing-webhook')
        domain = self.tenant.domains.first().domain
        res = self.client.post(url, webhook_data, format='json', SERVER_NAME=domain)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        
        # 3. Verify Reduction Request is cancelled
        req.refresh_from_db()
        self.assertEqual(req.status, 'CANCELLED')
        self.assertIn('Automatically cancelled', req.admin_note)
        
        # 4. Verify Tenant Storage (should have applied the +1GB from addon)
        self.tenant.refresh_from_db()
        # 5GB + 1GB = 6GB (6144 MB)
        self.assertEqual(self.tenant.extra_storage_mb, 6144)
