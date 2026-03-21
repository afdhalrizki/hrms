import pytest
from django.urls import reverse
from django_tenants.test.cases import TenantTestCase
from django_tenants.utils import schema_context
from rest_framework import status
from rest_framework.test import APIClient
from core.models import Employee, Department
from attendance.models import Attendance
from users.models import User
from datetime import date

@pytest.mark.django_db
class AttendanceReportingTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        
        with schema_context(self.tenant.schema_name):
            self.dept = Department.objects.create(name='Reporting IT')
            self.user = User.objects.create_user(email='admin_report@example.com', password='password', is_staff=True)
            self.user.tenants.add(self.tenant)
            
            self.employee = Employee.objects.create(
                fullname='Reporter Employee',
                email='reporter@example.com',
                department=self.dept,
                nik='R001',
                join_date=date.today(),
                ktp_number='R12345'
            )
            
            # Setup some attendance data for current month
            self.today = date.today()
            Attendance.objects.create(
                employee=self.employee,
                date=self.today,
                status='PRESENT'
            )
            
            self.domain_name = self.tenant.domains.first().domain

    def test_attendance_export_csv(self):
        """Verify the attendance export_csv action."""
        self.client.force_login(self.user)
        
        url = reverse('attendance-export-csv')
        # Add month and year params
        params = {
            'month': self.today.month,
            'year': self.today.year
        }
        
        response = self.client.get(url, params, SERVER_NAME=self.domain_name)
        
        assert response.status_code == status.HTTP_200_OK
        assert response['Content-Type'] == 'text/csv'
        assert f'attendance_recap_{self.today.month}_{self.today.year}.csv' in response['Content-Disposition']
        
        content = response.content.decode('utf-8')
        assert 'Employee Name,NIK,Present,Late,Off-site,Absent' in content
        assert 'Reporter Employee,R001,1,0,0,0' in content

    def test_attendance_export_csv_missing_params(self):
        """Should fail if month/year are missing."""
        self.client.force_login(self.user)
        url = reverse('attendance-export-csv')
        response = self.client.get(url, SERVER_NAME=self.domain_name)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
