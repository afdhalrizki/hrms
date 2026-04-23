from datetime import date, timedelta
from django.urls import reverse
from django_tenants.test.cases import FastTenantTestCase as TenantTestCase
from django_tenants.utils import schema_context
from rest_framework import status
from rest_framework.test import APIClient
from core.models import Employee, Department, AccessRole
from attendance.models import Attendance
from users.models import User

class AttendanceReportingEdgeTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.tenant.plan_type = 'PROFESSIONAL'
        self.tenant.enabled_modules = ['core', 'attendance']
        self.tenant.save()

        with schema_context(self.tenant.schema_name):
            self.dept = Department.objects.create(name="Operations")
            self.mgr_role = AccessRole.objects.create(name="Manager", permissions={'manage_attendance': True})
            
            self.user_admin = User.objects.create_user(email='admin@test.com', password='password', is_staff=True)
            self.user_admin.tenants.add(self.tenant)
            self.admin_emp = Employee.objects.create(
                fullname='Admin', email='admin@test.com', nik='A001', join_date=date.today(), 
                access_role=self.mgr_role, ktp_number='111'
            )

            self.user_emp = User.objects.create_user(email='emp@test.com', password='password')
            self.user_emp.tenants.add(self.tenant)
            self.employee = Employee.objects.create(
                fullname='Emp', email='emp@test.com', nik='E001', join_date=date.today(), ktp_number='222'
            )

            # Create some attendance records
            Attendance.objects.create(
                employee=self.employee, date=date(2026, 4, 1),
                check_in="08:00:00", check_out="17:00:00", status='PRESENT'
            )

        self.domain = self.tenant.domains.first().domain

    def test_export_csv_empty_results(self):
        """Verify that CSV export works even with no results."""
        self.client.force_authenticate(user=self.user_admin)
        url = reverse('attendance-export-csv')
        
        # Filter for a month with no data
        response = self.client.get(url, {'month': 5, 'year': 2026}, SERVER_NAME=self.domain, secure=True)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        content = response.content.decode('utf-8')
        # Should contain header but no data rows (header + 0 rows = 1 line)
        lines = content.strip().split('\r\n')
        self.assertEqual(len(lines), 1) # Just the header
        self.assertIn("Employee Name,NIK,Present,Late,Off-site,Absent", content)

    def test_export_csv_summary_filtering(self):
        """Verify that CSV export correctly aggregates attendance counts."""
        self.client.force_authenticate(user=self.user_admin)
        url = reverse('attendance-export-csv')
        
        # Correct month (April 2026)
        response = self.client.get(url, {'month': 4, 'year': 2026}, SERVER_NAME=self.domain, secure=True)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        content = response.content.decode('utf-8')
        self.assertIn("Emp", content)
        # Should show 1 Present, 0 Late, 0 Off-site, 0 Absent
        self.assertIn("1,0,0,0", content)

    def test_export_csv_unauthorized(self):
        """Verify that regular employees cannot access the export."""
        self.client.force_authenticate(user=self.user_emp)
        url = reverse('attendance-export-csv')
        response = self.client.get(url, SERVER_NAME=self.domain, secure=True)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
