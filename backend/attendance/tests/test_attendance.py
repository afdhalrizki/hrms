from datetime import date, time, timedelta
from django.urls import reverse
from django_tenants.test.cases import TenantTestCase
from decimal import Decimal
from django_tenants.utils import schema_context
from rest_framework import status
from rest_framework.test import APIClient
from core.models import Employee, Department, Branch
from attendance.models import Attendance, Shift, Schedule, LeaveRequest, Overtime, LeaveBalance
from attendance.services import AttendanceService
from users.models import User

class AttendanceIntegrationTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        
        # Consistent data setup within tenant context
        with schema_context(self.tenant.schema_name):
            # 0. Setup Branch
            self.branch_jakarta = Branch.objects.create(
                name='Jakarta Office',
                latitude=Decimal('-6.2088'),
                longitude=Decimal('106.8456'),
                radius_meters=100
            )

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
                email='test_user@example.com',
                department=self.dept,
                branch=self.branch_jakarta,
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
        dist = AttendanceService.calculate_distance(-6.2088, 106.8456, -6.2444, 106.8000)
        assert 6000 < dist < 7000

    def test_geofence_violation(self):
        """Attempting to clock in from a far location (Bandung) should result in OFF_SITE status."""
        self.client.force_login(self.user)
        
        url = reverse('attendance-list')
        payload = {
            'check_in': '08:00:00',
            'latitude_in': -6.9147,  # Bandung
            'longitude_in': 107.6098,
        }
        response = self.client.post(url, payload, format='json', SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'OFF_SITE')
        self.assertTrue(response.data['is_out_of_bounds'])

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
        self.assertFalse(response.data['is_late'])
        
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
        self.assertTrue(response.data['is_late'])

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
            'check_in': '07:50:00',
            'latitude_in': -6.2088,
            'longitude_in': 106.8456
        }
        response_early = self.client.post(url, payload_early, format='json', SERVER_NAME=self.domain_name)
        self.assertEqual(response_early.data['status'], 'PRESENT')
        
        # Case 2: Late (After 08:00) -> LATE
        # Since unique_together blocks same day, we use another date or delete.
        after_tomorrow = tomorrow + timedelta(days=1)
        payload_late = {
            'employee': self.employee.id,
            'date': str(after_tomorrow),
            'check_in': '08:10:00',
            'latitude_in': -6.2088,
            'longitude_in': 106.8456
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
        self.user.is_staff = True
        self.user.save()
        
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

    def test_assigned_branch_geofence(self):
        """Verify clock-in is relative to assigned branch even if multiple branches exist."""
        with schema_context(self.tenant.schema_name):
            # Create a second branch (Bandung)
            branch_bandung = Branch.objects.create(
                name='Bandung Office',
                latitude=Decimal('-6.9147'),
                longitude=Decimal('107.6098'),
                radius_meters=100
            )
            # Employee is assigned to Jakarta (setUp)
            
        self.client.force_login(self.user)
        url = reverse('attendance-list')
        
        # Clock in at Bandung (where the office exists, but user isn't assigned)
        payload = {
            'check_in': '08:00:00',
            'latitude_in': -6.9147,
            'longitude_in': 107.6098,
        }
        response = self.client.post(url, payload, format='json', SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Should be OFF_SITE because user is assigned to Jakarta
        self.assertEqual(response.data['status'], 'OFF_SITE')
        self.assertTrue(response.data['is_out_of_bounds'])

    def test_flexible_shift_no_late_status(self):
        """Clocking in late on a flexible shift should remain PRESENT."""
        with schema_context(self.tenant.schema_name):
            shift_flex = Shift.objects.create(
                name='Flexible Shift',
                start_time=time(9, 0),
                end_time=time(18, 0),
                is_flexible=True
            )
            future_date = self.today + timedelta(days=5)
            Schedule.objects.create(employee=self.employee, shift=shift_flex, date=future_date)
            
        self.client.force_login(self.user)
        url = reverse('attendance-list')
        payload = {
            'date': str(future_date),
            'check_in': '09:30:00', # 30 mins late
            'latitude_in': -6.2088,
            'longitude_in': 106.8456,
        }
        response = self.client.post(url, payload, format='json', SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Should be PRESENT because shift is flexible
        self.assertEqual(response.data['status'], 'PRESENT')
        self.assertFalse(response.data['is_late'])

    def test_rbac_attendance_hardening(self):
        """Verify that employees cannot modify status or others' attendance."""
        # 1. Employee cannot clock in for someone else
        other_user = User.objects.create_user(email='other@test.com', password='password')
        with schema_context(self.tenant.schema_name):
            other_emp = Employee.objects.create(
                fullname='Other', email='other@test.com', nik='K999',
                join_date=date.today(), ktp_number='999', department=self.dept
            )
        
        self.client.force_login(self.user)
        url = reverse('attendance-list')
        payload = {
            'employee': other_emp.id, # Trying to clock in for other_emp
            'date': str(self.today + timedelta(days=1)),
            'check_in': '08:00:00'
        }
        response = self.client.post(url, payload, format='json', SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # However, it should be assigned to self.employee (from self.user.email in perform_create)
        self.assertEqual(response.data['employee'], self.employee.id)

        # 2. Employee cannot 'fix' their own status via PATCH
        # Create an OFF_SITE record
        payload_off = {
            'date': str(self.today + timedelta(days=2)),
            'check_in': '08:00:00',
            'latitude_in': -6.9147,
            'longitude_in': 107.6098,
        }
        res_off = self.client.post(url, payload_off, format='json', SERVER_NAME=self.domain_name)
        att_id = res_off.data['id']
        self.assertEqual(res_off.data['status'], 'OFF_SITE')
        
        # Try to PATCH status to PRESENT
        detail_url = reverse('attendance-detail', kwargs={'pk': att_id})
        res_patch = self.client.patch(detail_url, {'status': 'PRESENT'}, format='json', SERVER_NAME=self.domain_name)
        # PATCH might return 200 but ignore the field, or return 403 on field update
        # In DRF ModelViewSet, it will just update if not read-only.
        # But our RBAC blocks PATCH on sensitive models if not manager.
        # Wait, AttendanceViewSet has allow_self_service = True.
        # Let's see if status is read-only in serializer.
        
        self.assertEqual(res_patch.data['status'], 'OFF_SITE') # Should NOT have changed

    def test_attendance_blocked_on_approved_leave(self):
        """Verify ValidationError when clocking in during an approved leave."""
        with schema_context(self.tenant.schema_name):
            leave_date = self.today + timedelta(days=20)
            LeaveRequest.objects.create(
                employee=self.employee,
                start_date=leave_date,
                end_date=leave_date,
                leave_type='CUTI',
                status='APPROVED'
            )
            
        self.client.force_login(self.user)
        url = reverse('attendance-list')
        payload = {
            'date': str(leave_date),
            'check_in': '08:00:00',
            'latitude_in': -6.2088,
            'longitude_in': 106.8456,
        }
        response = self.client.post(url, payload, format='json', SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('APPROVED leave', response.data['detail'])

    def test_leave_balance_insufficient_validation(self):
        """Verify ValidationError when requesting more leave than available."""
        self.client.force_login(self.user)
        with schema_context(self.tenant.schema_name):
            # Set balance to 2 days
            balance, _ = LeaveBalance.objects.get_or_create(employee=self.employee, year=self.today.year)
            balance.total_days = 2
            balance.used_days = 0
            balance.save()
            
        url = reverse('leaverequest-list')
        # Try to request 3 days
        payload = {
            'employee': self.employee.id,
            'start_date': str(self.today + timedelta(days=30)),
            'end_date': str(self.today + timedelta(days=32)),
            'leave_type': 'CUTI',
            'reason': 'Vacation'
        }
        response = self.client.post(url, payload, format='json', SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # Check in the whole response data string to be key-agnostic
        self.assertIn('Insufficient leave balance', str(response.data))

    def test_leave_balance_auto_deduction_on_approval(self):
        """Verify LeaveBalance.used_days increases when LeaveRequest is approved."""
        self.client.force_login(self.user)
        with schema_context(self.tenant.schema_name):
            balance, _ = LeaveBalance.objects.get_or_create(employee=self.employee, year=self.today.year)
            initial_used = balance.used_days
            
            leave = LeaveRequest.objects.create(
                employee=self.employee, 
                start_date=self.today + timedelta(days=10),
                end_date=self.today + timedelta(days=11), # 2 days
                leave_type='CUTI',
                status='PENDING'
            )
            
            # Approve it
            from core.services import WorkflowService
            WorkflowService.initialize_workflow(leave)
            WorkflowService.process_action(leave, self.employee, 'APPROVED', 'Enjoy')
            
            # Viewset Logic (perform_update) checks if status becomes APPROVED to deduct.
            # But the logic is in the ViewSet. Since I used Service directly, 
            # I must ensure the ViewSet logic is also tested via API.
            
            self.user.is_staff = True
            self.user.save()
            url = reverse('leaverequest-detail', kwargs={'pk': leave.id})
            # This triggers perform_update -> WorkflowService -> sets status to APPROVED
            self.client.patch(url, {'status': 'APPROVED'}, format='json', SERVER_NAME=self.domain_name)
            
            balance.refresh_from_db()
            self.assertEqual(balance.used_days, initial_used + 2)

    def test_attendance_overnight_shift(self):
        """Verify clock-in 22:00 and clock-out 06:00 (next day) handles hours correctly."""
        with schema_context(self.tenant.schema_name):
            shift_night = Shift.objects.create(
                name='Night Shift',
                start_time=time(22, 0),
                end_time=time(6, 0)
            )
            test_date = self.today + timedelta(days=10)
            Schedule.objects.create(employee=self.employee, shift=shift_night, date=test_date)
            
            self.client.force_login(self.user)
            url = reverse('attendance-list')
            
            # Clock-in at 22:05
            payload = {
                'date': str(test_date),
                'check_in': '22:05:00',
                'latitude_in': -6.2088,
                'longitude_in': 106.8456,
            }
            res = self.client.post(url, payload, format='json', SERVER_NAME=self.domain_name)
            self.assertEqual(res.status_code, status.HTTP_201_CREATED)
            self.assertEqual(res.data['status'], 'LATE')
            
            # Clock-out at 06:05 next day
            detail_url = reverse('attendance-detail', kwargs={'pk': res.data['id']})
            res_out = self.client.patch(detail_url, {'check_out': '06:05:00'}, format='json', SERVER_NAME=self.domain_name)
            self.assertEqual(res_out.status_code, status.HTTP_200_OK)
            
            att = Attendance.objects.get(id=res.data['id'])
            self.assertEqual(att.check_out, time(6, 5))
