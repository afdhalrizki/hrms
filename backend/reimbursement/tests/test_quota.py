from django.urls import reverse
from django_tenants.test.cases import FastTenantTestCase as TenantTestCase
from django_tenants.utils import schema_context
from rest_framework import status
from rest_framework.test import APIClient
from django.core.files.uploadedfile import SimpleUploadedFile
from core.models import Employee, Department
from reimbursement.models import ReimbursementCategory, Reimbursement
from datetime import date

class ReimbursementQuotaTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.domain_name = self.tenant.domains.first().domain
        
        with schema_context(self.tenant.schema_name):
            self.dept = Department.objects.create(name='Finance')
            self.employee = Employee.objects.create(
                fullname='Finance Staff',
                email='staff@finance.com',
                nik='F001',
                department=self.dept,
                join_date=date.today()
            )
            self.category = ReimbursementCategory.objects.create(name='Travel', max_amount=1000000)
            
            from django.contrib.auth import get_user_model
            User = get_user_model()
            self.user = User.objects.create_user(email='staff@finance.com', password='password')
            self.user.tenants.add(self.tenant)
            
            # Enable feature for the tenant
            self.tenant.enabled_modules = ['core', 'reimbursement']
            self.tenant.plan_type = 'PROFESSIONAL'
            self.tenant.save()
            
            self.client.force_login(self.user)

    def test_reimbursement_upload_blocked_when_quota_full(self):
        """
        [DEEP TEST] Verify that reimbursement creation is BLOCKED if storage quota is full.
        """
        # 1. Simulate full storage
        self.tenant.storage_limit_mb = 10
        self.tenant.storage_used_bytes = 10 * 1024 * 1024
        self.tenant.save()
        
        url = reverse('reimbursement-list')
        fake_attachment = SimpleUploadedFile("receipt.pdf", b"some pdf content", content_type="application/pdf")
        
        payload = {
            'category': self.category.id,
            'date': str(date.today()),
            'amount': '50000',
            'description': 'Taxi to airport',
            'attachment': fake_attachment
        }
        
        response = self.client.post(url, payload, format='multipart', SERVER_NAME=self.domain_name)
        
        # We EXPECT this to be 403 Forbidden or similar if quota enforcement is implemented.
        # If it's 201, then our analysis revealed a gap.
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('storage quota', response.data['detail'].lower())
