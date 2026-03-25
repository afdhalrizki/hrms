import os, django, sys
from pathlib import Path

# Setup Django
sys.path.append('D:/hr/hrms/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django_tenants.utils import schema_context
from core.models import Employee, WorkflowConfig, WorkflowStage
from attendance.models import LeaveRequest
from core.services import WorkflowService

with schema_context('company1'):
    # Clear existing
    WorkflowConfig.objects.all().delete()
    WorkflowStage.objects.all().delete()
    LeaveRequest.objects.all().delete()
    
    admin_emp = Employee.objects.get(email='admin@company1.com')
    
    # Create Leave
    leave = LeaveRequest.objects.create(
        employee=admin_emp,
        start_date='2026-05-01',
        end_date='2026-05-01',
        leave_type='SAKIT',
        reason='Debug',
        status='PENDING'
    )
    print(f"Created leave: ID={leave.id}, Status={leave.status}, Stage={leave.current_stage}")
    
    # Initialize workflow (should return False)
    res = WorkflowService.initialize_workflow(leave)
    print(f"Initialize result: {res}, Status={leave.status}, Stage={leave.current_stage}")
    
    # Process action
    WorkflowService.process_action(leave, admin_emp, 'APPROVED', 'Testing')
    print(f"Post-action: Status={leave.status}, Stage={leave.current_stage}")
    
    leave.refresh_from_db()
    print(f"Refreshed: Status={leave.status}, Stage={leave.current_stage}")
