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
from core.mixins import TenantIsolationMixin

class KPIViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
    queryset = KPI.objects.all()
    serializer_class = KPISerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission, FeatureRequiredPermission]
    required_rbac_permission = 'manage_performance'
    required_feature = 'performance'
    allow_self_service_list = True

class KPITargetViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
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

class AppraisalViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
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
    def export_xlsx(self, request):
        import pandas as pd
        from io import BytesIO
        from django.http import HttpResponse
        from django.utils import timezone
        
        queryset = self.filter_queryset(self.get_queryset())
        data = []
        for a in queryset:
            data.append({
                'Employee': a.employee.fullname,
                'Period': a.period_name,
                'Status': a.status,
                'Start Date': a.start_date,
                'End Date': a.end_date
            })
            
        df = pd.DataFrame(data)
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Appraisals')
            
        response = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="Performance_Recap_{timezone.now().strftime("%Y%m%d")}.xlsx"'
        return response

    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        from .pdf_generator import AppraisalPDFGenerator
        from django.http import HttpResponse
        
        appraisal = self.get_object()
        generator = AppraisalPDFGenerator(appraisal)
        pdf_content = generator.generate()
        
        response = HttpResponse(pdf_content, content_type='application/pdf')
        filename = f"Performance_Report_{appraisal.id}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=True, methods=['get'])
    def download_docx(self, request, pk=None):
        from .docx_generator import AppraisalDOCXGenerator
        from django.http import HttpResponse
        
        appraisal = self.get_object()
        generator = AppraisalDOCXGenerator(appraisal)
        docx_content = generator.generate()
        
        response = HttpResponse(
            docx_content, 
            content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        filename = f"Performance_Report_{appraisal.id}.docx"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        import csv
        from django.http import HttpResponse
        from .models import KPITarget
        from django.db.models import Avg
        
        # Security: Only allow managers/staff to export full reports
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        is_manager = user.is_staff or (employee and employee.access_role and (
            employee.access_role.permissions.get('manage_performance') or 
            employee.access_role.permissions.get('view_performance_report')
        ))
        
        if not is_manager:
            from rest_framework.response import Response
            return Response({'detail': 'Permission denied. Only managers can export reports.'}, status=403)

        queryset = self.get_queryset()
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
            
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="appraisal_summary.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Employee Name', 'NIK', 'Period', 'Status', 'Start Date', 'End Date', 'Avg KPI Achievement (%)'])
        
        for a in queryset:
            # Calculate average KPI achievement for this period
            targets = KPITarget.objects.filter(
                employee=a.employee,
                period__gte=a.start_date,
                period__lte=a.end_date
            )
            
            avg_achievement = 0
            if targets.exists():
                total_ach = 0
                for t in targets:
                    if t.target_value > 0:
                        total_ach += (t.actual_value / t.target_value) * 100
                avg_achievement = total_ach / targets.count()

            writer.writerow([
                a.employee.fullname, a.employee.nik, a.period_name, a.get_status_display(),
                a.start_date, a.end_date, f"{avg_achievement:.2f}"
            ])
            
        return response

class AppraisalReviewViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
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
