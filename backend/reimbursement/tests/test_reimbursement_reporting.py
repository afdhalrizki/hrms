from datetime import date
from django.urls import reverse
from django_tenants.test.cases import FastTenantTestCase as TenantTestCase
from django_tenants.utils import schema_context
from rest_framework import status
from rest_framework.test import APIClient
from core.models import Employee, Department, AccessRole
from reimbursement.models import Reimbursement, ReimbursementCategory
from users.models import User

class ReimbursementReportingTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.tenant.plan_type = 'PROFESSIONAL'
        self.tenant.enabled_modules = ['core', 'reimbursement']
        self.tenant.save()

        with schema_context(self.tenant.schema_name):
            self.dept = Department.objects.create(name="Finance")
            self.mgr_role = AccessRole.objects.create(name="Manager", permissions={'manage_reimbursement': True})
            
            self.user_admin = User.objects.create_user(email='admin@test.com', password='password', is_staff=True)
            self.user_admin.tenants.add(self.tenant)
            self.admin_emp = Employee.objects.create(
                fullname='Admin', email='admin@test.com', nik='A001', join_date=date.today(), access_role=self.mgr_role, ktp_number='111'
            )

            self.user_emp = User.objects.create_user(email='emp@test.com', password='password')
            self.user_emp.tenants.add(self.tenant)
            self.employee = Employee.objects.create(
                fullname='Emp', email='emp@test.com', nik='E001', join_date=date.today(), ktp_number='222'
            )

            self.cat = ReimbursementCategory.objects.create(name="Travel")
            
            # Create some reimbursements in different months
            Reimbursement.objects.create(
                employee=self.employee, category=self.cat, date=date(2026, 3, 15),
                amount=100000, description="March Trip", status='APPROVED'
            )
            Reimbursement.objects.create(
                employee=self.employee, category=self.cat, date=date(2026, 4, 10),
                amount=200000, description="April Trip", status='APPROVED'
            )

        self.domain = self.tenant.domains.first().domain

    def test_export_csv_filtering_by_month_year(self):
        """Verify that CSV export respects month and year filters."""
        self.client.force_authenticate(user=self.user_admin)
        url = reverse('reimbursement-export-csv')
        
        # 1. Filter for March
        response = self.client.get(url, {'month': 3, 'year': 2026}, SERVER_NAME=self.domain, secure=True)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        content = response.content.decode('utf-8')
        self.assertIn("March Trip", content)
        self.assertNotIn("April Trip", content)

        # 2. Filter for April
        response = self.client.get(url, {'month': 4, 'year': 2026}, SERVER_NAME=self.domain, secure=True)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        content = response.content.decode('utf-8')
        self.assertIn("April Trip", content)
        self.assertNotIn("March Trip", content)

    def test_workflow_returned_action(self):
        """Verify that the 'RETURNED' action moves the workflow back."""
        with schema_context(self.tenant.schema_name):
            rem = Reimbursement.objects.create(
                employee=self.employee, category=self.cat, date=date.today(),
                amount=50000, description="Return Test", status='PENDING'
            )
        
        self.client.force_authenticate(user=self.user_admin)
        url = reverse('reimbursement-process-action', kwargs={'pk': rem.id})
        
        # Process 'RETURNED'
        payload = {'action': 'RETURNED', 'notes': 'Incomplete receipt'}
        response = self.client.post(url, payload, format='json', SERVER_NAME=self.domain, secure=True)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        with schema_context(self.tenant.schema_name):
            rem.refresh_from_db()
            # Status should be 'RETURNED'
            self.assertEqual(rem.status, 'RETURNED')
            # Check workflow history if possible, or just the status
            
    def test_manager_visibility_get_queryset(self):
        """Verify that managers see all reimbursements while employees only see their own."""
        # Authenticate as manager
        self.client.force_authenticate(user=self.user_admin)
        url = reverse('reimbursement-list')
        response = self.client.get(url, SERVER_NAME=self.domain, secure=True)
        # Should see both (March and April)
        resp_data = response.json()
        self.assertEqual(len(resp_data), 2)

        # Authenticate as employee
        self.client.force_authenticate(user=self.user_emp)
        response = self.client.get(url, SERVER_NAME=self.domain, secure=True)
        # Still 2 because employee owns both. Let's create one for admin.
        with schema_context(self.tenant.schema_name):
            Reimbursement.objects.create(
                employee=self.admin_emp, category=self.cat, date=date.today(),
                amount=500, description="Admin Record"
            )
        
        response = self.client.get(url, SERVER_NAME=self.domain, secure=True)
        # Employee should still see only their 2
        resp_data = response.json()
        self.assertEqual(len(resp_data), 2)
        
        # Manager should see 3
        self.client.force_authenticate(user=self.user_admin)
        response = self.client.get(url, SERVER_NAME=self.domain, secure=True)
        resp_data = response.json()
        self.assertEqual(len(resp_data), 3)
