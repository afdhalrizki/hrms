from rest_framework import viewsets, permissions
from core.audit import AuditModelMixin
from core.permissions import HasRBACPermission
from .models import SalaryComponent, PayrollPeriod, Payslip, PayslipDetail
from .serializers import (
    SalaryComponentSerializer,
    PayrollPeriodSerializer,
    PayslipSerializer,
    PayslipDetailSerializer
)

class SalaryComponentViewSet(AuditModelMixin, viewsets.ModelViewSet):
    queryset = SalaryComponent.objects.all()
    serializer_class = SalaryComponentSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_rbac_permission = 'manage_payroll'

class PayrollPeriodViewSet(AuditModelMixin, viewsets.ModelViewSet):
    queryset = PayrollPeriod.objects.all()
    serializer_class = PayrollPeriodSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_rbac_permission = 'manage_payroll'

from rest_framework.decorators import action
from rest_framework.response import Response
from .services import PayrollCalculator
from core.models import Employee

class PayslipViewSet(AuditModelMixin, viewsets.ModelViewSet):
    queryset = Payslip.objects.all()
    serializer_class = PayslipSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_rbac_permission = 'manage_payroll'

    @action(detail=False, methods=['post'])
    def generate(self, request):
        period_id = request.data.get('period_id')
        employee_ids = request.data.get('employee_ids', [])
        
        if not period_id:
            return Response({'error': 'Period ID is required'}, status=400)
            
        period = PayrollPeriod.objects.get(id=period_id)
        
        if not employee_ids:
            employees = Employee.objects.all()
        else:
            employees = Employee.objects.filter(id__in=employee_ids)
            
        results = []
        for emp in employees:
            calc = PayrollCalculator(emp, period)
            payslip = calc.run()
            results.append(PayslipSerializer(payslip).data)
            
        return Response({
            'message': f'Successfully generated {len(results)} payslips',
            'payslips': results
        })

    def get_queryset(self):
        queryset = Payslip.objects.all()
        period_id = self.request.query_params.get('period_id')
        if period_id:
            queryset = queryset.filter(period_id=period_id)
        return queryset

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

class PayslipDetailViewSet(viewsets.ModelViewSet):
    queryset = PayslipDetail.objects.all()
    serializer_class = PayslipDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
