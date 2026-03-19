from rest_framework import viewsets, permissions
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
    required_rbac_permission = 'manage_performance' # Need to add this to RBAC
    required_feature = 'performance'

class KPITargetViewSet(AuditModelMixin, viewsets.ModelViewSet):
    queryset = KPITarget.objects.all()
    serializer_class = KPITargetSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission, FeatureRequiredPermission]
    required_rbac_permission = 'manage_performance'
    required_feature = 'performance'

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

    def get_queryset(self):
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        
        if user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('manage_performance')):
            return Appraisal.objects.all()
        
        # Employees see their own appraisals
        if employee:
            return Appraisal.objects.filter(employee=employee)
        return Appraisal.objects.none()

class AppraisalReviewViewSet(AuditModelMixin, viewsets.ModelViewSet):
    queryset = AppraisalReview.objects.all()
    serializer_class = AppraisalReviewSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission, FeatureRequiredPermission]
    required_rbac_permission = 'manage_performance'
    required_feature = 'performance'

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
