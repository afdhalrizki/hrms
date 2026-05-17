import datetime
from django_tenants.utils import schema_context
from rest_framework import status
from core.models import Employee, Department, Role, AccessRole
from attendance.models import (
    Attendance, LeaveRequest, LeaveBalance, 
    Overtime, Schedule, Shift, AttendanceCorrectionRequest
)
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.db import connection
from core.tests.base import HRMSTestCase as TenantTestCase

User = get_user_model()

class AttendanceWorkflowsTestCase(TenantTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.dept = Department.objects.create(name="Support")
        
        # Management Role
        cls.mgt_role = AccessRole.objects.create(
            name="Attendance Manager",
            permissions={'tenant_manage_attendance': True}
        )
        
        cls.admin_user = User.objects.create_user(email='admin@com.com', password='pwd', is_staff=True)
        cls.admin_emp = Employee.objects.create(
            email='admin@com.com', fullname="Admin Attendance", nik="ADM01",
            department=cls.dept, join_date="2024-01-01", ktp_number="KTP-ADM",
            access_role=cls.mgt_role
        )
        cls.admin_user.tenants.add(cls.tenant)
        
        cls.staff_user = User.objects.create_user(email='staff@com.com', password='pwd')
        cls.staff_emp = Employee.objects.create(
            email='staff@com.com', fullname="Staff User", nik="STF01",
            department=cls.dept, join_date="2024-01-01", ktp_number="KTP-STF",
            supervisor=cls.admin_emp
        )
        cls.staff_user.tenants.add(cls.tenant)
        
        # Shift and Balance
        cls.shift = Shift.objects.create(name="Reg", start_time="08:00:00", end_time="17:00:00")
        cls.balance = LeaveBalance.objects.create(employee=cls.staff_emp, year=2026, total_days=10, used_days=0)

    def setUp(self):
        super().setUp()
        self.staff_user.refresh_from_db()
        self.admin_user.refresh_from_db()
        self.balance.refresh_from_db()

    def test_leave_request_insufficient_balance(self):
        """Test validation fails if leave balance is too low."""
        self.client.force_authenticate(user=self.staff_user)
        url = reverse('leaverequest-list')
        data = {
            'employee': self.staff_emp.id,
            'leave_type': 'CUTI',
            'start_date': '2026-12-01',
            'end_date': '2026-12-15', # 15 days, balance is 10
            'reason': 'Vacation'
        }
        res = self.client.post(url, data, format='json', SERVER_NAME=str(self.domain))
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Insufficient leave balance', str(res.data))

    def test_leave_request_workflow_full_cycle(self):
        """Test LeaveRequest approval workflow and balance deduction."""
        self.client.force_authenticate(user=self.staff_user)
        url_list = reverse('leaverequest-list')
        data = {
            'employee': self.staff_emp.id,
            'leave_type': 'CUTI',
            'start_date': '2026-05-01',
            'end_date': '2026-05-02', # 2 days
            'reason': 'Personal'
        }
        res = self.client.post(url_list, data, format='json', SERVER_NAME=str(self.domain))
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        leave_id = res.data['id']
        
        # Admin approves
        self.client.force_authenticate(user=self.admin_user)
        url_detail = reverse('leaverequest-detail', kwargs={'pk': leave_id})
        res = self.client.patch(url_detail, {'action': 'APPROVED'}, format='json', SERVER_NAME=str(self.domain))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['status'], 'APPROVED')
        
        # Verify balance deduction
        self.balance.refresh_from_db()
        self.assertEqual(self.balance.used_days, 2)

    def test_attendance_correction_application(self):
        """Test that approving a correction request actually updates the Attendance record."""
        att = Attendance.objects.create(
            employee=self.staff_emp, date="2026-04-20", 
            check_in="09:00:00", status="LATE"
        )
        
        self.client.force_authenticate(user=self.staff_user)
        url_list = reverse('attendancecorrectionrequest-list')
        data = {
            'attendance': att.id,
            'reason': 'Forgot to clock in',
            'requested_check_in': '08:00:00'
        }
        res = self.client.post(url_list, data, format='json', SERVER_NAME=str(self.domain))
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        corr_id = res.data['id']
        
        # Admin approves correction
        self.client.force_authenticate(user=self.admin_user)
        url_detail = reverse('attendancecorrectionrequest-detail', kwargs={'pk': corr_id})
        res = self.client.patch(url_detail, {'action': 'APPROVED'}, format='json', SERVER_NAME=str(self.domain))
        
        att.refresh_from_db()
        self.assertEqual(att.check_in.strftime('%H:%M:%S'), '08:00:00')

    def test_overtime_request_workflow(self):
        """Test Overtime request creation and simple status update."""
        self.client.force_authenticate(user=self.staff_user)
        url = reverse('overtime-list')
        data = {
            'employee': self.staff_emp.id,
            'date': '2026-04-21',
            'hours': 2,
            'reason': 'Project launch'
        }
        res = self.client.post(url, data, format='json', SERVER_NAME=str(self.domain))
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        
        # Admin rejects
        self.client.force_authenticate(user=self.admin_user)
        url_detail = reverse('overtime-detail', kwargs={'pk': res.data['id']})
        res = self.client.patch(url_detail, {'action': 'REJECTED', 'comment': 'Not needed'}, format='json', SERVER_NAME=str(self.domain))
        self.assertEqual(res.data['status'], 'REJECTED')

    def test_schedule_filtering(self):
        """Test ScheduleViewSet filtering by employee and date."""
        Schedule.objects.create(employee=self.staff_emp, date="2026-04-22", shift=self.shift)
        
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('schedule-list')
        
        # Test employee filter
        res = self.client.get(f"{url}?employee_id={self.staff_emp.id}", SERVER_NAME=str(self.domain))
        self.assertGreaterEqual(len(res.data), 1)
        
        # Test date filter
        res = self.client.get(f"{url}?date=2026-04-22", SERVER_NAME=str(self.domain))
        self.assertGreaterEqual(len(res.data), 1)
        
        # Test empty filter - use a very far future date
        res = self.client.get(f"{url}?date=2099-12-31", SERVER_NAME=str(self.domain))
        self.assertEqual(len(res.data), 0)

    def test_leave_balance_staff_visibility(self):
        """Test staff only sees their own leave balance."""
        other_emp = Employee.objects.create(
            email='other@com.com', fullname="Other", nik="OTH01", 
            department=self.dept, ktp_number="KTP-OTH", join_date="2024-01-01"
        )
        LeaveBalance.objects.create(employee=other_emp, year=2026)
        
        self.client.force_authenticate(user=self.staff_user)
        url = reverse('leavebalance-list')
        res = self.client.get(url, SERVER_NAME=str(self.domain))
        # Should only see own
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['employee'], self.staff_emp.id)
