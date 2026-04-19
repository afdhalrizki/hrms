from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from core.audit import AuditModelMixin
from core.permissions import HasRBACPermission, FeatureRequiredPermission
from .models import KPI, KPITarget, Appraisal, AppraisalReview
from .serializers import (
    KPISerializer, 
    KPITargetSerializer, 
    AppraisalSerializer, 
    AppraisalReviewSerializer
)
from core.models import Employee
from django.db.models import Q

class KPIViewSet(AuditModelMixin, viewsets.ModelViewSet):
    queryset = KPI.objects.all()
    serializer_class = KPISerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission, FeatureRequiredPermission]
    required_rbac_permission = 'manage_performance'
    required_feature = 'performance'
    allow_self_service_list = True

class KPITargetViewSet(AuditModelMixin, viewsets.ModelViewSet):
    queryset = KPITarget.objects.all()
    serializer_class = KPITargetSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission, FeatureRequiredPermission]
    required_rbac_permission = 'manage_performance'
    required_feature = 'performance'
    allow_self_service_list = True

    def get_queryset(self):
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        
        # Managers/Admins see all
        if user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('manage_performance')):
            return KPITarget.objects.all()
        
        # Employees see their own targets
        if employee:
            return KPITarget.objects.filter(employee=employee)
        return KPITarget.objects.none()

class AppraisalViewSet(AuditModelMixin, viewsets.ModelViewSet):
    queryset = Appraisal.objects.all()
    serializer_class = AppraisalSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission, FeatureRequiredPermission]
    required_rbac_permission = 'manage_performance'
    required_feature = 'performance'
    allow_self_service_list = True

    def get_queryset(self):
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        
        # Staff users can see everything
        if user.is_staff:
            return Appraisal.objects.all()

        # Managers/Admins with specific permissions also see everything
        if employee and employee.access_role:
            has_manage = employee.access_role.permissions.get('manage_performance')
            has_view = employee.access_role.permissions.get('view_performance_report')
            if has_manage or has_view:
                return Appraisal.objects.all()
        
        # Employees see their own appraisals
        if employee:
            return Appraisal.objects.filter(employee=employee)
        return Appraisal.objects.none()

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        import csv
        from django.http import HttpResponse
        
        queryset = self.get_queryset()
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
            
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="appraisal_summary.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Employee Name', 'Period', 'Status', 'Start Date', 'End Date'])
        
        for a in queryset:
            writer.writerow([
                a.employee.fullname, a.period_name, a.get_status_display(),
                a.start_date, a.end_date
            ])
            
        return response

class AppraisalReviewViewSet(AuditModelMixin, viewsets.ModelViewSet):
    queryset = AppraisalReview.objects.all()
    serializer_class = AppraisalReviewSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission, FeatureRequiredPermission]
    required_rbac_permission = 'manage_performance'
    required_feature = 'performance'
    allow_self_service = True
    allow_self_service_list = True

    def get_queryset(self):
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        
        # Can see reviews if they are the reviewer or the appraisee (only after completion)
        if user.is_staff:
            return AppraisalReview.objects.all()
            
        if employee:
            return AppraisalReview.objects.filter(
                Q(reviewer=employee) | 
                Q(appraisal__employee=employee, appraisal__status='COMPLETED')
            )
        return AppraisalReview.objects.none()
