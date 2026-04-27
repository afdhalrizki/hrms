import pytest
from django.urls import reverse
from core.tests.base import HRMSTestCase as TenantTestCase
from django_tenants.utils import schema_context
from rest_framework import status
from rest_framework.test import APIClient
from core.models import Employee, Department
from reimbursement.models import Reimbursement, ReimbursementCategory
from users.models import User
from datetime import date

@pytest.mark.django_db
class ReimbursementReportingTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        
        with schema_context(self.tenant.schema_name):
            self.dept = Department.objects.create(name='Finance Dept')
            self.user = User.objects.create_user(email='finance_mgr@example.com', password='password', is_staff=True)
            self.user.tenants.add(self.tenant)
            
            self.employee = Employee.objects.create(
                fullname='Finance Employee',
                email='finance_mgr@example.com',
                department=self.dept,
                nik='F001',
                join_date=date.today(),
                ktp_number='F12345'
            )
            
            self.category = ReimbursementCategory.objects.create(name='Travel')
            self.reimb = Reimbursement.objects.create(
                employee=self.employee,
                category=self.category,
                amount=500000,
                date=date.today(),
                description='Travel to Jakarta',
                status='APPROVED',
                approved_amount=500000
            )
            
            self.domain_name = self.tenant.domains.first().domain

    def test_reimbursement_download_pdf(self):
        """Verify reimbursement voucher PDF download."""
        self.client.force_login(self.user)
        url = reverse('reimbursement-download-pdf', kwargs={'pk': self.reimb.id})
        
        response = self.client.get(url, SERVER_NAME=self.domain_name)
        assert response.status_code == status.HTTP_200_OK
        assert response['Content-Type'] == 'application/pdf'
        assert f'Reimbursement_Voucher_{self.reimb.id}.pdf' in response['Content-Disposition']

    def test_reimbursement_download_docx(self):
        """Verify reimbursement voucher DOCX download."""
        self.client.force_login(self.user)
        url = reverse('reimbursement-download-docx', kwargs={'pk': self.reimb.id})
        
        response = self.client.get(url, SERVER_NAME=self.domain_name)
        assert response.status_code == status.HTTP_200_OK
        assert response['Content-Type'] == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        assert f'Reimbursement_Voucher_{self.reimb.id}.docx' in response['Content-Disposition']

    def test_reimbursement_export_xlsx(self):
        """Verify reimbursement XLSX export."""
        self.client.force_login(self.user)
        url = reverse('reimbursement-export-xlsx')
        
        response = self.client.get(url, SERVER_NAME=self.domain_name)
        assert response.status_code == status.HTTP_200_OK
        assert response['Content-Type'] == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        assert 'Reimbursement_Recap' in response['Content-Disposition']
