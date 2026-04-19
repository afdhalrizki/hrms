from django_tenants.test.cases import TenantTestCase
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
            self.branch = Branch.objects.create(
                name="Test Branch",
                latitude=0, longitude=0, radius_meters=100
            )
            self.emp = Employee.objects.create(
                fullname="Test Employee",
                email="test@example.com",
                branch=self.branch,
                nik="EMP-WF-001",
                join_date=date(2024, 1, 1),
                ktp_number="1111111111"
            )
            # Create User for employee
            User.objects.create_user(email="test@example.com", password="password")

            self.supervisor = Employee.objects.create(
                fullname="Supervisor",
                email="sup@example.com",
                nik="SUP-WF-001",
                join_date=date(2024, 1, 1),
                ktp_number="2222222222"
            )
            # Create User for supervisor
            User.objects.create_user(email="sup@example.com", password="password")

            self.emp.supervisor = self.supervisor
            self.emp.save()


        # Create Workflow: 1. Supervisor -> 2. HR (Auto-approve for test)
        self.config = WorkflowConfig.objects.create(
            model_type='LEAVE',
            is_active=True
        )
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
            approver_type='ROLE' # Assume specialized role
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
            self.assertIsNone(WorkflowStage.objects.filter(workflow=self.config, sequence__gt=leave.current_stage.sequence).first())

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

