import pytest
from django.urls import reverse
from core.tests.base import HRMSTestCase as TenantTestCase
from django_tenants.utils import schema_context
from rest_framework import status
from rest_framework.test import APIClient
from core.models import Employee, Department
from performance.models import Appraisal
from users.models import User
from datetime import date

@pytest.mark.django_db
class PerformanceReportingTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        
        # Enable 'performance' module for this tenant
        self.tenant.plan_type = 'PROFESSIONAL'
        self.tenant.enabled_modules = ['core', 'performance']
        self.tenant.save()
        
        with schema_context(self.tenant.schema_name):
            self.dept = Department.objects.create(name='Performance HR')
            self.user = User.objects.create_user(email='hr_report@example.com', password='password', is_staff=True)
            self.user.tenants.add(self.tenant)
            
            # User must have an Employee record for HasRBACPermission
            Employee.objects.create(
                fullname='HR Reporter',
                email='hr_report@example.com',
                department=self.dept,
                nik='HR001',
                join_date=date.today(),
                ktp_number='HR12345'
            )
            
            self.employee = Employee.objects.create(
                fullname='Performance Reviewee',
                email='reviewee@example.com',
                department=self.dept,
                nik='P001',
                join_date=date.today(),
                ktp_number='P12345'
            )
            
            # Setup an appraisal
            self.today = date.today()
            self.appraisal = Appraisal.objects.create(
                employee=self.employee,
                period_name='Q1 2026',
                start_date=self.today,
                end_date=self.today + date.resolution,
                status='COMPLETED'
            )
            
            self.domain_name = self.tenant.domains.first().domain

    def test_appraisal_export_csv(self):
        """Verify the appraisal export_csv action."""
        self.client.force_login(self.user)
        
        url = reverse('appraisal-export-csv')
        response = self.client.get(url, SERVER_NAME=self.domain_name)
        
        assert response.status_code == status.HTTP_200_OK
        assert response['Content-Type'] == 'text/csv'
        assert 'appraisal_summary.csv' in response['Content-Disposition']
        
        content = response.content.decode('utf-8')
        assert 'Employee Name,NIK,Period,Status,Start Date,End Date' in content
        assert f'Performance Reviewee,P001,Q1 2026,Completed,{self.today}' in content

    def test_appraisal_export_csv_filtered(self):
        """Verify filtering by status."""
        self.client.force_login(self.user)
        url = reverse('appraisal-export-csv')
        
        # Filter for DRAFT status (should be empty)
        response = self.client.get(url, {'status': 'DRAFT'}, SERVER_NAME=self.domain_name)
        assert response.status_code == status.HTTP_200_OK
        content = response.content.decode('utf-8')
        assert 'Performance Reviewee' not in content
