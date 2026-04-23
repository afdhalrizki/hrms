import datetime
from django_tenants.test.cases import FastTenantTestCase as TenantTestCase
from rest_framework import status
from rest_framework.test import APIClient
from core.models import Employee, Department, Role, AccessRole
from attendance.models import Attendance
from django.urls import reverse
from django.contrib.auth import get_user_model

User = get_user_model()

class AttendanceExpandedTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.dept = Department.objects.create(name="Ops")
        self.role = Role.objects.create(name="Guard", department=self.dept)
        
        # Admin User
        self.admin_user = User.objects.create_user(email='admin@com.com', password='pwd', is_staff=True)
        self.admin_emp = Employee.objects.create(
            email='admin@com.com', fullname="Admin Attendance", nik="ADM01",
            department=self.dept, role=self.role, join_date="2024-01-01",
            ktp_number="KTP-ADM01"
        )
        self.admin_user.tenants.add(self.tenant)
        
        # Staff User
        self.staff_user = User.objects.create_user(email='staff@com.com', password='pwd')
        self.staff_emp = Employee.objects.create(
            email='staff@com.com', fullname="Staff Attendance", nik="STF01",
            department=self.dept, role=self.role, join_date="2024-01-01",
            ktp_number="KTP-STF01"
        )
        self.staff_user.tenants.add(self.tenant)

    def test_attendance_list_filtering_by_employee_id(self):
        """Test manager can filter attendance by employee_id."""
        self.client.force_authenticate(user=self.admin_user)
        Attendance.objects.create(employee=self.staff_emp, date="2026-04-10", status='PRESENT')
        
        url = reverse('attendance-list')
        res = self.client.get(f"{url}?employee_id={self.staff_emp.id}", SERVER_NAME=self.tenant.domains.first().domain)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Should return the one for staff_emp
        self.assertEqual(len(res.data), 1)

    def test_attendance_create_with_dict_employee_payload(self):
        """Test creating attendance where employee is passed as a dict (common in some FE frameworks)."""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('attendance-list')
        data = {
            'employee': {'id': self.staff_emp.id},
            'latitude_in': -6.2,
            'longitude_in': 106.8,
            'check_in': '08:30:00',
            'date': '2026-04-12'
        }
        res = self.client.get(f"{url}", SERVER_NAME=self.tenant.domains.first().domain) # warming up connection
        res = self.client.post(url, data, format='json', SERVER_NAME=self.tenant.domains.first().domain)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Attendance.objects.filter(employee=self.staff_emp).count(), 1)

    def test_attendance_create_missing_profile_error(self):
        """Test error when user has no employee profile."""
        ghost_user = User.objects.create_user(email='ghost@com.com', password='pwd')
        ghost_user.tenants.add(self.tenant)
        self.client.force_authenticate(user=ghost_user)
        
        url = reverse('attendance-list')
        res = self.client.post(url, {'latitude_in': 0, 'longitude_in': 0}, format='json', SERVER_NAME=self.tenant.domains.first().domain)
        # It hits HasRBACPermission which blocks if no employee profile found
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_attendance_get_queryset_none_fallback(self):
        """Test queryset returns none if no employee found for user."""
        ghost_user = User.objects.create_user(email='ghost2@com.com', password='pwd')
        ghost_user.tenants.add(self.tenant)
        self.client.force_authenticate(user=ghost_user)
        url = reverse('attendance-list')
        res = self.client.get(url, SERVER_NAME=self.tenant.domains.first().domain)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_attendance_manual_audit_trail_assignment(self):
        """Test that created_by is assigned even if Service bypasses serializer."""
        self.client.force_authenticate(user=self.staff_user)
        url = reverse('attendance-list')
        data = {
            'latitude_in': -6.2,
            'longitude_in': 106.8,
            'check_in': '09:00:00',
            'date': '2026-04-15'
        }
        res = self.client.post(url, data, format='json', SERVER_NAME=self.tenant.domains.first().domain)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        att = Attendance.objects.get(date='2026-04-15')
        self.assertEqual(att.created_by, self.staff_user)
        self.assertEqual(att.updated_by, self.staff_user)
