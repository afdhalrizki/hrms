from django.db import models, connection
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from core.audit import AuditModelMixin
from core.permissions import HasRBACPermission, FeatureRequiredPermission
from core.models import Employee
from core.services import WorkflowService
from .models import Reimbursement, ReimbursementCategory
from .serializers import ReimbursementSerializer, ReimbursementCategorySerializer

class ReimbursementCategoryViewSet(AuditModelMixin, viewsets.ModelViewSet):
    queryset = ReimbursementCategory.objects.all()
    serializer_class = ReimbursementCategorySerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission, FeatureRequiredPermission]
    required_rbac_permission = 'manage_settings'
    required_feature = 'reimbursement'
    allow_self_service_list = True

class ReimbursementViewSet(AuditModelMixin, viewsets.ModelViewSet):
    queryset = Reimbursement.objects.all()
    serializer_class = ReimbursementSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission, FeatureRequiredPermission]
    required_rbac_permission = 'manage_reimbursement'
    required_feature = 'reimbursement'
    allow_self_service = True
    allow_self_service_list = True

    def get_queryset(self):
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        
        # Managers/Finance see all
        if user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('manage_reimbursement')):
            return Reimbursement.objects.all()
            
        # Supervisors see their subordinates
        if employee:
            subordinates = Employee.objects.filter(supervisor=employee)
            if subordinates.exists():
                return Reimbursement.objects.filter(
                    models.Q(employee=employee) | models.Q(employee__in=subordinates)
                ).distinct()
            
            # Standard employees only see their own
            return Reimbursement.objects.filter(employee=employee)
            
        return Reimbursement.objects.none()

    def perform_create(self, serializer):
        # Quota Enforcement: Check storage capacity if an attachment is provided
        if self.request.FILES.get('attachment') and hasattr(self.request, 'tenant'):
            current_used = self.request.tenant.storage_used_bytes
            limit = self.request.tenant.storage_limit_mb * 1024 * 1024
            if current_used >= limit:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied('Storage quota exceeded. Please upgrade your plan or delete old attachments.')

        employee = Employee.objects.filter(email=self.request.user.email).first()
        instance = serializer.save(employee=employee)
        # Initialize the dynamic workflow
        WorkflowService.initialize_workflow(instance)

    @action(detail=True, methods=['post'])
    def process_action(self, request, pk=None, action_override=None):
        """
        Unified workflow selection: Approve, Reject, or Return for Revision.
        """
        reimbursement = self.get_object()
        action = action_override or request.data.get('action')
        comment = request.data.get('comment', '')
        
        if action not in ['APPROVED', 'REJECTED', 'RETURNED']:
            return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)
            
        employee = Employee.objects.filter(email=request.user.email).first()
        
        # Capture approved amount if provided during approval, otherwise fallback to original amount
        approved_amount = request.data.get('approved_amount')
        if approved_amount:
            reimbursement.approved_amount = approved_amount
            reimbursement.save(update_fields=['approved_amount'])
        elif action == 'APPROVED' and reimbursement.approved_amount is None:
            # Fallback for simple/legacy flows or when not explicitly adjusted
            reimbursement.approved_amount = reimbursement.amount
            reimbursement.save(update_fields=['approved_amount'])
            
        # Dynamic Workflow handling
        if reimbursement.current_stage:
            WorkflowService.process_action(reimbursement, employee, action, comment)
        else:
            # Legacy handling if no workflow is active
            if action == 'APPROVED':
                is_supervisor = reimbursement.employee.supervisor == employee
                is_finance = request.user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('manage_reimbursement'))
                
                if is_supervisor:
                    reimbursement.supervisor_status = 'APPROVED'
                
                if is_finance:
                    reimbursement.finance_status = 'APPROVED'
                    # Only final status APPROVED if we have finance approval in legacy flow
                    reimbursement.status = 'APPROVED'
                
                reimbursement.save()
            elif action == 'REJECTED':
                reimbursement.status = 'REJECTED'
                reimbursement.save()
        return Response({
            'status': f'Action {action} processed',
            'current_status': reimbursement.status
        })

    @action(detail=True, methods=['post'])
    def approve_supervisor(self, request, pk=None):
        """[DEPRECATED] Use process_action instead."""
        return self.process_action(request, pk, action_override='APPROVED')

    @action(detail=True, methods=['post'])
    def approve_finance(self, request, pk=None):
        """[DEPRECATED] Use process_action instead."""
        return self.process_action(request, pk, action_override='APPROVED')

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        reimbursement = self.get_object()
        reimbursement.status = 'REJECTED'
        reimbursement.notes = request.data.get('notes', 'Rejected by admin')
        reimbursement.save()
        return Response({'status': 'Rejected'})

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        import csv
        from django.http import HttpResponse
        
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        
        queryset = Reimbursement.objects.filter(status='APPROVED')
        if month and year:
            queryset = queryset.filter(date__month=month, date__year=year)
            
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="reimbursements_{month}_{year}.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Employee', 'NIK', 'Category', 'Date', 'Amount', 'Approved Amount', 'Description'])
        
        for r in queryset:
            writer.writerow([
                r.employee.fullname, r.employee.nik, r.category.name, 
                r.date, r.amount, r.approved_amount, r.description
            ])
            
        return response
