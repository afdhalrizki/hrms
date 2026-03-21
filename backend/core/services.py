from django.db import transaction
from .models import WorkflowConfig, WorkflowStage, WorkflowAction, Employee

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
        Sets the initial stage for a new request.
        """
        config = WorkflowService.get_config_for_model(instance.__class__.__name__)
        if config:
            first_stage = config.stages.first()
            if first_stage:
                instance.current_stage = first_stage
                instance.status = 'PENDING'
                instance.save()
                return True
        return False

    @staticmethod
    @transaction.atomic
    def process_action(instance, actor_employee, action, comment=""):
        """
        Processes an approval/rejection action and transitions to the next stage.
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

        if action == 'REJECTED':
            instance.status = 'REJECTED'
            instance.save()
            return

        if action == 'APPROVED':
            # Check if there's a next stage
            next_stage = WorkflowStage.objects.filter(
                workflow=current_stage.workflow,
                sequence__gt=current_stage.sequence
            ).first()

            if next_stage:
                instance.current_stage = next_stage
                instance.status = 'PENDING'
            else:
                # No more stages, final approval
                instance.status = 'APPROVED'
            
            instance.save()
