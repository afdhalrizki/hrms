from datetime import date, time, timedelta
from django.urls import reverse
from django_tenants.test.cases import TenantTestCase
from django_tenants.utils import schema_context
from rest_framework import status
from rest_framework.test import APIClient
from core.models import Employee, Department
from attendance.models import Attendance, Shift, Schedule, LeaveRequest, Overtime
from users.models import User

class AttendanceIntegrationTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        
        # Consistent data setup within tenant context
        with schema_context(self.tenant.schema_name):
            # 1. Setup Master Data
            self.dept = Department.objects.create(name='IT')
            
            # 2. Setup Shift (08:00 - 17:00)
            self.shift_morning = Shift.objects.create(
                name='Morning Shift',
                start_time=time(8, 0),
                end_time=time(17, 0)
            )
            
            # 3. Setup User & Employee
            self.user = User.objects.create_user(email='test_user@example.com', password='password')
            self.user.tenants.add(self.tenant)
            
            self.employee = Employee.objects.create(
                fullname='Test User',
                email='test@example.com',
                department=self.dept,
                phone='12345',
                nik='K001',
                join_date=date.today(),
                ktp_number='1234567890'
            )
            
            # 4. Setup Schedule for today (Standard)
            self.today = date.today()
            self.schedule = Schedule.objects.create(
                employee=self.employee,
                shift=self.shift_morning,
                date=self.today
            )
            
            # Domain for SERVER_NAME
            self.domain_name = self.tenant.domains.first().domain

    def test_haversine_distance_math(self):
        """Verify the distance calculation helper."""
        from attendance.views import haversine_distance
        dist = haversine_distance(-6.2088, 106.8456, -6.2444, 106.8000)
        assert 6000 < dist < 7000

    def test_geofence_violation(self):
        """Attempting to clock in from a far location should fail."""
        self.client.force_login(self.user)
        
        url = reverse('attendance-list')
        payload = {
            'employee': self.employee.id,
            'date': str(self.today),
            'check_in': '08:00:00',
            'latitude_in': -6.9147,  # Bandung
            'longitude_in': 107.6098,
        }
        response = self.client.post(url, payload, format='json', SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Geofencing violation', response.data['error'])

    def test_successful_check_in_and_check_out(self):
        """Standard flow: Check-in (PRESENT) then Check-out."""
        self.client.force_login(self.user)
        
        # 1. Check-in
        url = reverse('attendance-list')
        payload = {
            'employee': self.employee.id,
            'date': str(self.today),
            'check_in': '07:55:00',
            'latitude_in': -6.2088,
            'longitude_in': 106.8456,
        }
        response = self.client.post(url, payload, format='json', SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'PRESENT')
        
        attendance_id = response.data['id']
        
        # 2. Check-out (PATCH)
        detail_url = reverse('attendance-detail', kwargs={'pk': attendance_id})
        patch_payload = {'check_out': '17:05:00'}
        patch_response = self.client.patch(detail_url, patch_payload, format='json', SERVER_NAME=self.domain_name)
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        
        # Verify in DB
        with schema_context(self.tenant.schema_name):
            att = Attendance.objects.get(id=attendance_id)
            self.assertEqual(att.check_out, time(17, 5))

    def test_late_check_in(self):
        """Clocking in after shift start should mark as LATE."""
        self.client.force_login(self.user)
        
        url = reverse('attendance-list')
        payload = {
            'employee': self.employee.id,
            'date': str(self.today),
            'check_in': '08:15:00',
            'latitude_in': -6.2088,
            'longitude_in': 106.8456,
        }
        response = self.client.post(url, payload, format='json', SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'LATE')

    def test_double_check_in_prevention(self):
        """Should not allow two attendance records for same employee/date."""
        self.client.force_login(self.user)
        url = reverse('attendance-list')
        payload = {
            'employee': self.employee.id,
            'date': str(self.today),
            'check_in': '08:00:00'
        }
        
        # First one succeeds
        response1 = self.client.post(url, payload, format='json', SERVER_NAME=self.domain_name)
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)
        
        # Second one fails (Integrity/Unique constraint)
        response2 = self.client.post(url, payload, format='json', SERVER_NAME=self.domain_name)
        # Note: Depending on implementation, this might be 400 (if handled) or 500/Integrity (if raw).
        # Django-REST default for unique_together is 400.
        self.assertEqual(response2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_attendance_without_schedule(self):
        """Falls back to 08:00 default if no schedule exists."""
        self.client.force_login(self.user)
        
        tomorrow = self.today + timedelta(days=1)
        url = reverse('attendance-list')
        
        # Case 1: Early (Before 08:00) -> PRESENT
        payload_early = {
            'employee': self.employee.id,
            'date': str(tomorrow),
            'check_in': '07:50:00'
        }
        response_early = self.client.post(url, payload_early, format='json', SERVER_NAME=self.domain_name)
        self.assertEqual(response_early.data['status'], 'PRESENT')
        
        # Case 2: Late (After 08:00) -> LATE
        # Since unique_together blocks same day, we use another date or delete.
        after_tomorrow = tomorrow + timedelta(days=1)
        payload_late = {
            'employee': self.employee.id,
            'date': str(after_tomorrow),
            'check_in': '08:10:00'
        }
        response_late = self.client.post(url, payload_late, format='json', SERVER_NAME=self.domain_name)
        self.assertEqual(response_late.data['status'], 'LATE')

    def test_leave_request_workflow(self):
        """Test creating and approving a leave request."""
        self.client.force_login(self.user)
        
        url = reverse('leaverequest-list')
        payload = {
            'employee': self.employee.id,
            'start_date': str(self.today),
            'end_date': str(self.today + timedelta(days=2)),
            'leave_type': 'SAKIT',
            'reason': 'Medical checkup'
        }
        response = self.client.post(url, payload, format='json', SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'PENDING')
        
        leave_id = response.data['id']
        
        # Admin approves (PATCH)
        # In a real scenario, we'd check permissions, but for this test we verify logic.
        detail_url = reverse('leaverequest-detail', kwargs={'pk': leave_id})
        self.client.patch(detail_url, {'status': 'APPROVED'}, format='json', SERVER_NAME=self.domain_name)
        
        with schema_context(self.tenant.schema_name):
            leave = LeaveRequest.objects.get(id=leave_id)
            self.assertEqual(leave.status, 'APPROVED')

    def test_overtime_request(self):
        """Test creating an overtime request."""
        self.client.force_login(self.user)
        
        url = reverse('overtime-list')
        payload = {
            'employee': self.employee.id,
            'date': str(self.today),
            'hours': '2.50',
            'reason': 'Project deadline'
        }
        response = self.client.post(url, payload, format='json', SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(float(response.data['hours']), 2.50)

    def test_audit_fields_filled(self):
        """Ensure AuditModelMixin correctly fills created_by."""
        self.client.force_login(self.user)
        
        url = reverse('attendance-list')
        payload = {
            'employee': self.employee.id,
            'date': str(self.today + timedelta(days=10)), # Far future to avoid conflicts
            'check_in': '08:00:00'
        }
        response = self.client.post(url, payload, format='json', SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        with schema_context(self.tenant.schema_name):
            att = Attendance.objects.get(id=response.data['id'])
            self.assertEqual(att.created_by, self.user)
