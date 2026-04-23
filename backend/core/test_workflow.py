from core.tests.base import HRMSTestCase as TenantTestCase
from django_tenants.utils import schema_context
from core.models import Branch, WorkflowConfig, WorkflowStage, WorkflowAction, Employee
from core.services import WorkflowService
from attendance.models import LeaveRequest
from notifications.models import SystemNotification
from users.models import User
from datetime import date

class WorkflowIntegrationTest(TenantTestCase):
    def setUp(self):
        super().setUp()
        with schema_context(self.tenant.schema_name):
            # Use get_or_create to avoid collisions in the same worker/class
            self.branch, _ = Branch.objects.get_or_create(
                name="Test Branch",
                defaults={"latitude": 0, "longitude": 0, "radius_meters": 100}
            )
            self.emp, _ = Employee.objects.get_or_create(
                email="test@example.com",
                defaults={
                    "fullname": "Test Employee",
                    "branch": self.branch,
                    "nik": "EMP-WF-001",
                    "join_date": date(2024, 1, 1),
                    "ktp_number": "1111111111"
                }
            )
            # Create User for employee
            User.objects.get_or_create(email="test@example.com", defaults={"password": "password"})

            self.supervisor, _ = Employee.objects.get_or_create(
                email="sup@example.com",
                defaults={
                    "fullname": "Supervisor",
                    "nik": "SUP-WF-001",
                    "join_date": date(2024, 1, 1),
                    "ktp_number": "2222222222"
                }
            )
            # Create User for supervisor
            User.objects.get_or_create(email="sup@example.com", defaults={"password": "password"})

            self.emp.supervisor = self.supervisor
            self.emp.save()

            # Create Workflow: 1. Supervisor -> 2. HR (Auto-approve for test)
            self.config, _ = WorkflowConfig.objects.get_or_create(
                model_type='LEAVE',
                defaults={'name': 'Leave Workflow', 'is_active': True}
            )
            
            # Clear stages for fresh state in each test method
            self.config.stages.all().delete()
            
            self.s1 = WorkflowStage.objects.create(
                workflow=self.config,
                name="Supervisor Approval",
                sequence=1,
                approver_type='SUPERVISOR'
            )
            self.s2 = WorkflowStage.objects.create(
                workflow=self.config,
                name="Final Approval",
                sequence=2,
                approver_type='ROLE'
            )

    def test_workflow_lifecycle(self):
        with schema_context(self.tenant.schema_name):
            # 1. Create Leave request
            leave = LeaveRequest.objects.create(
                employee=self.emp,
                leave_type='CUTI',
                start_date=date(2026, 1, 1),
                end_date=date(2026, 1, 1),
                reason="Vacation"
            )
            
            # Initialize
            WorkflowService.initialize_workflow(leave)
            self.assertEqual(leave.current_stage, self.s1)
            self.assertEqual(leave.status, 'PENDING')
            
            # Assertion: Supervisor should have 1 notification
            self.assertTrue(SystemNotification.objects.filter(category='OPERATIONAL', title="Persetujuan Diperlukan").exists())

            # 2. Supervisor approves
            WorkflowService.process_action(leave, self.supervisor, 'APPROVED', "Looks good")
            leave.refresh_from_db()
            self.assertEqual(leave.current_stage, self.s2)
            self.assertEqual(leave.status, 'PENDING')

            # 3. Final approval
            WorkflowService.process_action(leave, self.supervisor, 'APPROVED', "Final check")
            leave.refresh_from_db()
            self.assertEqual(leave.status, 'APPROVED')
            
            # Assertion: Employee should have 1 approval notification
            self.assertTrue(SystemNotification.objects.filter(category='OPERATIONAL', title="Status Pengajuan: Success").exists())

    def test_workflow_rejection(self):
        with schema_context(self.tenant.schema_name):
            leave = LeaveRequest.objects.create(
                employee=self.emp,
                leave_type='CUTI',
                start_date=date(2026, 1, 1),
                end_date=date(2026, 1, 1),
                reason="Vacation"
            )
            WorkflowService.initialize_workflow(leave)
            
            # Reject at stage 1
            WorkflowService.process_action(leave, self.supervisor, 'REJECTED', "No.")
            leave.refresh_from_db()
            self.assertEqual(leave.status, 'REJECTED')
            self.assertEqual(leave.current_stage, self.s1) # Stays at failed stage
