from rest_framework import viewsets, permissions
from core.audit import AuditModelMixin
from core.permissions import HasRBACPermission, FeatureRequiredPermission
from .models import SalaryComponent, PayrollPeriod, Payslip, PayslipDetail, EmployeeSalaryComponent
from .serializers import (
    SalaryComponentSerializer,
    PayrollPeriodSerializer,
    PayslipSerializer,
    PayslipDetailSerializer,
    EmployeeSalaryComponentSerializer
)

from core.mixins import TenantIsolationMixin

class SalaryComponentViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
    queryset = SalaryComponent.objects.all()
    serializer_class = SalaryComponentSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission, FeatureRequiredPermission]
    required_rbac_permission = 'manage_payroll'
    required_feature = 'payroll'

class EmployeeSalaryComponentViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
    queryset = EmployeeSalaryComponent.objects.all()
    serializer_class = EmployeeSalaryComponentSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission, FeatureRequiredPermission]
    required_rbac_permission = 'manage_payroll'
    required_feature = 'payroll'

    def get_queryset(self):
        queryset = EmployeeSalaryComponent.objects.all()
        emp_id = self.request.query_params.get('employee_id') or self.request.query_params.get('employee')
        if emp_id:
            queryset = queryset.filter(employee_id=emp_id)
        return queryset

class PayrollPeriodViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
    queryset = PayrollPeriod.objects.all()
    serializer_class = PayrollPeriodSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission, FeatureRequiredPermission]
    required_rbac_permission = 'manage_payroll'
    required_feature = 'payroll'

from rest_framework.decorators import action
from rest_framework.response import Response
from .services import PayrollCalculator
from core.models import Employee

class PayslipViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
    queryset = Payslip.objects.all()
    serializer_class = PayslipSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission, FeatureRequiredPermission]
    required_rbac_permission = 'manage_payroll'
    required_feature = 'payroll'
    allow_self_service = True
    allow_self_service_list = True

    @action(detail=False, methods=['post'])
    def generate(self, request):
        from django.db import connection
        tenant = connection.tenant
        if not tenant.is_subscription_active:
            return Response({
                'error': 'Subscription expired or suspended. Payroll generation is disabled.',
                'code': 'SUBSCRIPTION_INACTIVE'
            }, status=402)

        period_id = request.data.get('period_id')
        employee_ids = request.data.get('employee_ids', [])
        
        if not period_id:
            return Response({'error': 'Period ID is required'}, status=400)
            
        period = PayrollPeriod.objects.get(id=period_id)
        
        if not employee_ids:
            employees = Employee.objects.all()
        else:
            employees = Employee.objects.filter(id__in=employee_ids)
            
        from django.db import IntegrityError
        results = []
        skipped = 0
        for emp in employees:
            try:
                calc = PayrollCalculator(emp, period)
                payslip = calc.run()
                results.append(PayslipSerializer(payslip).data)
            except IntegrityError:
                skipped += 1
                continue
            
        return Response({
            'message': f'Successfully generated {len(results)} payslips' + (f' ({skipped} already generated)' if skipped > 0 else ''),
            'payslips': results,
            'skipped_count': skipped
        })

    def get_queryset(self):
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).select_related('access_role').first()
        
        # Managers or auditors see all payslips
        is_payroll_admin = False
        if employee and employee.access_role:
            perms = employee.access_role.permissions
            is_payroll_admin = perms.get('manage_payroll', False) or perms.get('view_all_payslips', False)

        if user.is_staff or is_payroll_admin:
            queryset = Payslip.objects.all()
            period_id = self.request.query_params.get('period_id')
            employee_id = self.request.query_params.get('employee_id') or self.request.query_params.get('employee')
            month = self.request.query_params.get('period_month')
            year = self.request.query_params.get('period_year')
            
            if period_id:
                queryset = queryset.filter(period_id=period_id)
            if employee_id:
                queryset = queryset.filter(employee_id=employee_id)
            if month:
                queryset = queryset.filter(period__month=month)
            if year:
                queryset = queryset.filter(period__year=year)
            return queryset
            
        # Employees only see their own
        if employee:
            return Payslip.objects.filter(employee=employee)
        return Payslip.objects.none()

    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        from .pdf_generator import PayslipPDFGenerator
        from django.http import HttpResponse
        
        payslip = self.get_object()
        generator = PayslipPDFGenerator(payslip)
        pdf_content = generator.generate()
        
        response = HttpResponse(pdf_content, content_type='application/pdf')
        filename = f"Payslip_{payslip.employee.nik}_{payslip.period.get_month_display()}_{payslip.period.year}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

class PayslipDetailViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
    queryset = PayslipDetail.objects.all()
    serializer_class = PayslipDetailSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission, FeatureRequiredPermission]
    required_rbac_permission = 'manage_payroll'
    required_feature = 'payroll'
    allow_self_service = True
    allow_self_service_list = True

    def get_queryset(self):
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).select_related('access_role').first()
        
        is_payroll_admin = False
        if employee and employee.access_role:
            is_payroll_admin = employee.access_role.permissions.get('manage_payroll', False)

        if user.is_staff or is_payroll_admin:
            queryset = PayslipDetail.objects.all()
            payslip_id = self.request.query_params.get('payslip_id') or self.request.query_params.get('payslip')
            if payslip_id:
                queryset = queryset.filter(payslip_id=payslip_id)
            return queryset
            
        if employee:
            return PayslipDetail.objects.filter(payslip__employee=employee)
        return PayslipDetail.objects.none()
