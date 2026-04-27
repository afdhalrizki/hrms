import pytest
from django.urls import reverse
from core.tests.base import HRMSTestCase as TenantTestCase
from django_tenants.utils import schema_context
from rest_framework import status
from rest_framework.test import APIClient
from core.models import Employee, Department
from performance.models import Appraisal, KPI, KPITarget
from users.models import User
from datetime import date

@pytest.mark.django_db
class PerformanceReportingTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        
        # Enable performance module
        self.tenant.plan_type = 'PROFESSIONAL'
        self.tenant.enabled_modules = ['core', 'performance']
        self.tenant.save()
        
        with schema_context(self.tenant.schema_name):
            self.dept = Department.objects.create(name='Perf Dept')
            self.user = User.objects.create_user(email='perf_mgr@example.com', password='password', is_staff=True)
            self.user.tenants.add(self.tenant)
            
            self.employee = Employee.objects.create(
                fullname='Perf Employee',
                email='perf_mgr@example.com',
                department=self.dept,
                nik='PERF001',
                join_date=date.today(),
                ktp_number='PERF123'
            )
            
            self.appraisal = Appraisal.objects.create(
                employee=self.employee,
                period_name='Q1 2026',
                start_date=date(2026, 1, 1),
                end_date=date(2026, 3, 31),
                status='COMPLETED'
            )
            
            self.kpi = KPI.objects.create(name='Sales Target')
            self.target = KPITarget.objects.create(
                employee=self.employee,
                kpi=self.kpi,
                target_value=100,
                actual_value=120,
                period=date(2026, 1, 1)
            )
            
            self.domain_name = self.tenant.domains.first().domain

    def test_performance_download_pdf(self):
        """Verify appraisal PDF download."""
        self.client.force_login(self.user)
        url = reverse('appraisal-download-pdf', kwargs={'pk': self.appraisal.id})
        
        response = self.client.get(url, SERVER_NAME=self.domain_name)
        assert response.status_code == status.HTTP_200_OK
        assert response['Content-Type'] == 'application/pdf'
        assert f'Performance_Report_{self.appraisal.id}.pdf' in response['Content-Disposition']

    def test_performance_export_csv_with_scores(self):
        """Verify appraisal CSV export includes achievement scores."""
        self.client.force_login(self.user)
        url = reverse('appraisal-export-csv')
        
        response = self.client.get(url, SERVER_NAME=self.domain_name)
        assert response.status_code == status.HTTP_200_OK
        assert response['Content-Type'] == 'text/csv'
        
        content = response.content.decode('utf-8')
        assert 'Avg KPI Achievement (%)' in content
        assert '120.00' in content # 120/100 * 100
