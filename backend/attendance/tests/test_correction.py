from datetime import date, time
from django.urls import reverse
from core.tests.base import HRMSTestCase as TenantTestCase
from django_tenants.utils import schema_context
from rest_framework import status
from rest_framework.test import APIClient
from core.models import Employee, AccessRole, Branch, WorkflowConfig, WorkflowStage
from attendance.models import Attendance, AttendanceCorrectionRequest
from users.models import User

class AttendanceCorrectionTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        
        with schema_context(self.tenant.schema_name):
            # 1. Setup Branch
            self.branch = Branch.objects.create(name="Test Branch", latitude=0, longitude=0, radius_meters=100)
            
            # 2. Setup Roles
            self.role_emp = AccessRole.objects.create(name="Employee", permissions={"attendance": True})
            self.role_mgr = AccessRole.objects.create(name="Manager", permissions={"tenant_manage_attendance": True})
            
            # 3. Setup Users & Employees
            self.user_john = User.objects.create_user(email='john@example.com', password='password')
            self.user_john.tenants.add(self.tenant)
            self.employee_john = Employee.objects.create(
                fullname='John Doe', email='john@example.com', branch=self.branch, access_role=self.role_emp,
                nik='E001', join_date=date.today(), ktp_number='111111'
            )
            
            self.user_jane = User.objects.create_user(email='jane@example.com', password='password')
            self.user_jane.tenants.add(self.tenant)
            self.employee_jane = Employee.objects.create(
                fullname='Admin Jane', email='jane@example.com', branch=self.branch, access_role=self.role_mgr,
                nik='E002', join_date=date.today(), ktp_number='222222'
            )
            
            # 4. Setup Attendance
            self.attendance = Attendance.objects.create(
                employee=self.employee_john, date=date.today(), check_in=time(9, 0), status='PRESENT'
            )
            
            # 5. Setup Workflow Config
            self.config = WorkflowConfig.objects.create(model_type='ATTENDANCE_CORRECTION', is_active=True)
            WorkflowStage.objects.create(workflow=self.config, name="Supervisor Approval", sequence=1)
            
            # Domain for SERVER_NAME
            self.domain_name = self.tenant.domains.first().domain

    def test_employee_cannot_edit_check_in_directly(self):
        """Verify that a regular employee cannot edit check_in/out directly via PATCH."""
        self.client.force_login(self.user_john)
        
        url = reverse('attendance-detail', kwargs={'pk': self.attendance.id})
        payload = {'check_in': '08:00:00'}
        response = self.client.patch(url, payload, format='json', HTTP_HOST=self.domain_name)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        with schema_context(self.tenant.schema_name):
            self.attendance.refresh_from_db()
            self.assertEqual(self.attendance.check_in, time(9, 0)) # Should NOT change

    def test_attendance_correction_workflow_success(self):
        """Complete flow: Create Request -> Approve -> Attendance Updated."""
        # 1. Employee creates request
        self.client.force_login(self.user_john)
        url = reverse('attendancecorrectionrequest-list')
        payload = {
            'attendance': self.attendance.id,
            'requested_check_in': '08:30:00',
            'requested_check_out': '17:30:00',
            'reason': 'Forgot to clock in'
        }
        response = self.client.post(url, payload, format='json', HTTP_HOST=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        request_id = response.data['id']
        
        # Verify status is PENDING
        self.assertEqual(response.data['status'], 'PENDING')
        
        # 2. Manager approves request
        self.client.force_login(self.user_jane)
        detail_url = reverse('attendancecorrectionrequest-detail', kwargs={'pk': request_id})
        # Note: In our implementation, perform_update handles the workflow transition
        patch_response = self.client.patch(detail_url, {'status': 'APPROVED'}, format='json', HTTP_HOST=self.domain_name)
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_response.data['status'], 'APPROVED') # debug
        
        # 3. Verify original attendance is updated
        with schema_context(self.tenant.schema_name):
            self.attendance.refresh_from_db()
            self.assertEqual(self.attendance.check_in, time(8, 30))
            self.assertEqual(self.attendance.check_out, time(17, 30))
            
            # Verify request status in DB
            corr_req = AttendanceCorrectionRequest.objects.get(id=request_id)
            self.assertEqual(corr_req.status, 'APPROVED')
