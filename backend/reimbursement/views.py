from django.db import models, connection
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from core.audit import AuditModelMixin
from core.permissions import HasRBACPermission, FeatureRequiredPermission
from core.models import Employee
from .models import Reimbursement, ReimbursementCategory
from .serializers import ReimbursementSerializer, ReimbursementCategorySerializer

class ReimbursementCategoryViewSet(AuditModelMixin, viewsets.ModelViewSet):
    queryset = ReimbursementCategory.objects.all()
    serializer_class = ReimbursementCategorySerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission, FeatureRequiredPermission]
    required_rbac_permission = 'manage_settings'
    required_feature = 'reimbursement'

class ReimbursementViewSet(AuditModelMixin, viewsets.ModelViewSet):
    queryset = Reimbursement.objects.all()
    serializer_class = ReimbursementSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission, FeatureRequiredPermission]
    required_rbac_permission = 'manage_reimbursement'
    required_feature = 'reimbursement'
    allow_self_service = True

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
        employee = Employee.objects.filter(email=self.request.user.email).first()
        serializer.save(employee=employee)

    @action(detail=True, methods=['post'])
    def approve_supervisor(self, request, pk=None):
        reimbursement = self.get_object()
        reimbursement.supervisor_status = 'APPROVED'
        reimbursement.save()
        self._update_final_status(reimbursement)
        return Response({'status': 'Supervisor approved', 'final_status': reimbursement.status})

    @action(detail=True, methods=['post'])
    def approve_finance(self, request, pk=None):
        reimbursement = self.get_object()
        reimbursement.finance_status = 'APPROVED'
        # Finance can adjust the approved amount
        approved_amount = request.data.get('approved_amount')
        if approved_amount:
            reimbursement.approved_amount = approved_amount
        else:
            reimbursement.approved_amount = reimbursement.amount
            
        reimbursement.save()
        self._update_final_status(reimbursement)
        return Response({'status': 'Finance approved', 'final_status': reimbursement.status})

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

    def _update_final_status(self, reimbursement):
        from django.db import connection
        tenant = connection.tenant
        
        # Default behavior: Both Supervisor and Finance must approve
        # Logic can follow Phase 38 settings if applied globally, 
        # but for Reimbursement we usually want Finance to have the final say.
        if reimbursement.supervisor_status == 'APPROVED' and reimbursement.finance_status == 'APPROVED':
            reimbursement.status = 'APPROVED'
            reimbursement.save()
