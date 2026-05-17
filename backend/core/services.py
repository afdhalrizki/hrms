from django.db import transaction
from .models import WorkflowConfig, WorkflowStage, WorkflowAction, Employee, AccessRole
from . import constants

class WorkflowService:
    @staticmethod
    def get_config_for_model(model_name):
        """
        Retrieves the workflow configuration for a specific model type.
        """
        mapping = {
            'LeaveRequest': 'LEAVE',
            'Overtime': 'OVERTIME',
            'Reimbursement': 'REIMBURSEMENT',
            'AttendanceCorrectionRequest': 'ATTENDANCE_CORRECTION',
        }
        model_type = mapping.get(model_name)
        if not model_type:
            return None
        return WorkflowConfig.objects.filter(model_type=model_type, is_active=True).first()

    @staticmethod
    def initialize_workflow(instance):
        """
        Sets the initial stage for a new request and notifies the first approver.
        """
        config = WorkflowService.get_config_for_model(instance.__class__.__name__)
        if config:
            first_stage = config.stages.first()
            if first_stage:
                instance.current_stage = first_stage
                instance.status = 'PENDING'
                instance.save()
                
                # Notification: Pending Approval
                from notifications.services import NotificationService
                service = NotificationService()
                
                # Determine approver from stage config
                approver = None
                if first_stage.approver_type == 'SUPERVISOR':
                    approver = instance.employee.supervisor
                elif first_stage.approver_type == 'EMPLOYEE':
                    approver = first_stage.approver_employee
                
                if approver:
                    service.notify_pending_approval(instance, approver)
                
                return True
        return False

    @staticmethod
    @transaction.atomic
    def process_action(instance, actor_employee, action, comment=""):
        """
        Processes an approval/rejection action and transitions to the next stage.
        Triggers notifications for employees and next approvers.
        """
        current_stage = instance.current_stage
        if not current_stage:
            # Fallback to legacy or auto-approve if no workflow
            instance.status = action
            instance.save()
            return

        # Record the action
        WorkflowAction.objects.create(
            target_model=instance.__class__.__name__,
            target_id=instance.id,
            stage=current_stage,
            actor=actor_employee,
            action=action,
            comment=comment
        )

        from notifications.services import NotificationService
        service = NotificationService()

        if action == 'REJECTED':
            instance.status = 'REJECTED'
            instance.save()
            service.notify_workflow_status_change(instance, actor_employee, 'REJECTED')
            return

        if action == 'RETURNED':
            instance.status = 'RETURNED'
            instance.save()
            service.notify_workflow_status_change(instance, actor_employee, 'RETURNED')
            return

        if action == 'APPROVED':
            # Check if there's a next stage
            next_stage = WorkflowStage.objects.filter(
                workflow=current_stage.workflow,
                sequence__gt=current_stage.sequence
            ).first()

            # Admin Bypass: If the actor is a tenant admin (has tenant_manage_settings), 
            # they can finalize the approval in one step, bypassing subsequent stages.
            is_admin = False
            if actor_employee and actor_employee.access_role:
                is_admin = actor_employee.access_role.permissions.get('tenant_manage_settings', False)

            if next_stage and not is_admin:
                instance.current_stage = next_stage
                instance.status = 'PENDING'
                instance.save()
                
                # Notification: Next Approver
                approver = None
                if next_stage.approver_type == 'SUPERVISOR':
                    approver = instance.employee.supervisor
                elif next_stage.approver_type == 'EMPLOYEE':
                    approver = next_stage.approver_employee
                
                if approver:
                    service.notify_pending_approval(instance, approver)
            else:
                # No more stages OR Admin Bypass, final approval
                instance.status = 'APPROVED'
                instance.save()
                service.notify_workflow_status_change(instance, actor_employee, 'APPROVED')

class RoleService:
    @staticmethod
    def initialize_default_roles():
        """
        Creates or updates the 3 foundational system roles.
        Safe to call multiple times (idempotent).
        """
        # 1. Admin Role (Full Access)
        all_perms = {k: True for k in constants.PERMISSIONS_POOL.keys()}
        admin_role, _ = AccessRole.objects.get_or_create(
            name="Admin",
            defaults={
                "description": "Full system access with all permissions enabled.",
                "permissions": all_perms,
                "is_default": True
            }
        )

        # 2. HR Manager Role (Operational & Approval Access)
        hr_perms = {k: False for k in constants.PERMISSIONS_POOL.keys()}
        hr_keys = [
            constants.TENANT_MANAGE_HR, 
            constants.TENANT_MANAGE_PAYROLL, 
            constants.TENANT_MANAGE_ATTENDANCE,
            constants.TENANT_MANAGE_REIMBURSEMENT,
            constants.TENANT_APPROVE_LEAVE,
            constants.TENANT_APPROVE_REIMBURSEMENT,
            constants.TENANT_APPROVE_ATTENDANCE_CORRECTION,
            constants.TENANT_APPROVE_OVERTIME,
            constants.TENANT_VIEW_ALL_PAYSLIPS,
            constants.TENANT_VIEW_PERFORMANCE_REPORT
        ]
        for k in hr_keys: 
            hr_perms[k] = True
            
        AccessRole.objects.get_or_create(
            name="HR Manager",
            defaults={
                "description": "Personnel management, payroll processing, and approval workflows.",
                "permissions": hr_perms,
                "is_default": True
            }
        )

        # 3. Staff Role (Self-Service only)
        staff_perms = {k: False for k in constants.PERMISSIONS_POOL.keys()}
        staff_role, _ = AccessRole.objects.get_or_create(
            name="Staff",
            defaults={
                "description": "Basic self-service access for employees.",
                "permissions": staff_perms,
                "is_default": True
            }
        )
        
        return admin_role, staff_role
