from datetime import date
from django.urls import reverse
from django_tenants.test.cases import FastTenantTestCase as TenantTestCase
from django_tenants.utils import schema_context
from rest_framework import status
from rest_framework.test import APIClient
from core.models import Employee, Department, AccessRole
from performance.models import Appraisal
from users.models import User

class PerformancePrivacyTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.tenant.plan_type = 'PROFESSIONAL'
        self.tenant.enabled_modules = ['core', 'performance']
        self.tenant.save()

        with schema_context(self.tenant.schema_name):
            self.dept = Department.objects.create(name="HR")
            self.mgr_role = AccessRole.objects.create(name="Manager", permissions={'manage_performance': True})
            
            # Users and Employees
            self.user_admin = User.objects.create_user(email='admin@test.com', password='password', is_staff=True)
            self.user_admin.tenants.add(self.tenant)
            self.admin_emp = Employee.objects.create(
                fullname='Admin', email='admin@test.com', nik='A001', join_date=date.today(), 
                access_role=self.mgr_role, ktp_number='111'
            )

            self.user_emp = User.objects.create_user(email='emp@test.com', password='password')
            self.user_emp.tenants.add(self.tenant)
            self.employee = Employee.objects.create(
                fullname='Emp One', email='emp@test.com', nik='E001', join_date=date.today(), ktp_number='222'
            )

            self.user_other = User.objects.create_user(email='other@test.com', password='password')
            self.user_other.tenants.add(self.tenant)
            self.other_emp = Employee.objects.create(
                fullname='Other', email='other@test.com', nik='E002', join_date=date.today(), ktp_number='333'
            )

            # Appraisals
            self.appraisal_emp = Appraisal.objects.create(
                employee=self.employee, period_name="Q1 2026",
                start_date=date(2026, 1, 1), end_date=date(2026, 3, 31),
                status='COMPLETED'
            )
            self.appraisal_other = Appraisal.objects.create(
                employee=self.other_emp, period_name="Q1 2026",
                start_date=date(2026, 1, 1), end_date=date(2026, 3, 31),
                status='COMPLETED'
            )

        self.domain = self.tenant.domains.first().domain

    def test_employee_visibility_restricted(self):
        """Verify that an employee can only see their own appraisal."""
        self.client.force_authenticate(user=self.user_emp)
        url = reverse('appraisal-list')
        response = self.client.get(url, SERVER_NAME=self.domain, secure=True)
        resp_data = response.json()
        
        # Should only see 1 record (their own)
        self.assertEqual(len(resp_data), 1)
        self.assertEqual(resp_data[0]['employee'], self.employee.id)

    def test_manager_visibility_full(self):
        """Verify that a manager can see all appraisals."""
        self.client.force_authenticate(user=self.user_admin)
        url = reverse('appraisal-list')
        response = self.client.get(url, SERVER_NAME=self.domain, secure=True)
        resp_data = response.json()
        
        # Should see both records
        self.assertEqual(len(resp_data), 2)

    def test_export_csv_access_control(self):
        """Verify that only managers can access the CSV export."""
        url = reverse('appraisal-export-csv')
        
        # 1. Employee should be denied (403)
        self.client.force_authenticate(user=self.user_emp)
        response = self.client.get(url, SERVER_NAME=self.domain, secure=True)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Manager should be allowed (200)
        self.client.force_authenticate(user=self.user_admin)
        response = self.client.get(url, SERVER_NAME=self.domain, secure=True)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        content = response.content.decode('utf-8')
        self.assertIn("Emp One", content)
        self.assertIn("Other", content)
