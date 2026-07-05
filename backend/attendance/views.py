import math
from decimal import Decimal
from datetime import date, datetime
from django.db import transaction
from rest_framework import viewsets, permissions, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.cache import cache
from core.audit import AuditModelMixin
from core.permissions import HasTenantRBACPermission, FeatureRequiredPermission
# Using absolute import from core
from core.models import Employee
from .models import Attendance, LeaveRequest, Overtime, Shift, Schedule, LeaveBalance, AttendanceCorrectionRequest, FingerprintDevice, DeviceAttendanceLog
from .serializers import (
    AttendanceSerializer, LeaveRequestSerializer, OvertimeSerializer,
    ShiftSerializer, ScheduleSerializer, LeaveBalanceSerializer,
    AttendanceCorrectionRequestSerializer, FingerprintDeviceSerializer, DeviceAttendanceLogSerializer
)


from .services import AttendanceService

from core.mixins import TenantIsolationMixin

# ── ViewSets ────────────────────────────────────────────────────────────────
class AttendanceViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantRBACPermission, FeatureRequiredPermission]
    required_rbac_permission = 'tenant_manage_attendance'
    required_feature = 'attendance'
    allow_self_service = True
    allow_self_service_list = True

    def get_queryset(self):
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        
        # Managers and Staff see everything
        if user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('tenant_manage_attendance')):
            queryset = Attendance.objects.all()
            skipped = self.request.query_params.get('biometric_skipped')
            if skipped:
                queryset = queryset.filter(biometric_skipped=(skipped.lower() == 'true'))
                
            employee_id = self.request.query_params.get('employee_id')
            date_param = self.request.query_params.get('date')
            if employee_id:
                queryset = queryset.filter(employee_id=employee_id)
            if date_param:
                queryset = queryset.filter(date=date_param)
            return queryset
            
        # Regular employees only see their own records
        if employee:
            queryset = Attendance.objects.filter(employee=employee)
            date_param = self.request.query_params.get('date')
            if date_param:
                queryset = queryset.filter(date=date_param)
            return queryset
        return Attendance.objects.none()

    def perform_create(self, serializer):
        """Automatically assign the employee to the current folder user if not manager."""
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        
        # If user is not a manager, they can only create attendance for themselves
        is_manager = user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('tenant_manage_attendance'))
        
        if not is_manager and employee:
            instance = serializer.save(employee=employee, created_by=user, updated_by=user)
        else:
            instance = serializer.save(created_by=user, updated_by=user)
            
        from core.audit import AuditLogger
        AuditLogger.log_change('CREATE', instance, actor=user)

    def create(self, request, *args, **kwargs):
        """Override create to use AttendanceService for geofencing and status."""
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        
        if not employee:
            return Response({'error': 'No employee profile found for this user.'}, status=status.HTTP_400_BAD_REQUEST)

        # Enforce Platform Policy
        from django.db import connection
        from django_tenants.utils import get_tenant_model
        tenant = get_tenant_model().objects.get(schema_name=connection.schema_name)
        
        platform = request.data.get('platform', 'mobile') # Default to mobile if not specified
        if tenant.attendance_platform_policy == 'MOBILE' and platform == 'web':
            return Response({
                'error': 'Clock-in is restricted to the mobile application only.'
            }, status=status.HTTP_403_FORBIDDEN)

        # Allow managers to specify target employee
        target_employee = employee
        if request.data.get('employee'):
            is_manager = user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('tenant_manage_attendance'))
            if is_manager:
                target_employee_id = request.data.get('employee')
                if isinstance(target_employee_id, dict):
                    target_employee_id = target_employee_id.get('id')
                target_employee = Employee.objects.get(id=target_employee_id)

        lat = request.data.get('latitude_in') or request.data.get('latitude_out')
        lng = request.data.get('longitude_in') or request.data.get('longitude_out')
        photo = request.data.get('photo_in') or request.data.get('photo_out')

        if lat and lng:
            if not target_employee:
                return Response({'error': 'Target employee record not found.'}, status=status.HTTP_400_BAD_REQUEST)

            check_in_str = request.data.get('check_in')
            check_out_str = request.data.get('check_out')
            date_str = request.data.get('date')
            
            check_time = None
            if check_in_str:
                 check_time = datetime.strptime(check_in_str, '%H:%M:%S').time()
            elif check_out_str:
                 check_time = datetime.strptime(check_out_str, '%H:%M:%S').time()
            
            check_date = None
            if date_str:
                 check_date = datetime.strptime(date_str, '%Y-%m-%d').date()

            if check_out_str:
                attendance = AttendanceService.process_clock_out(
                    employee=target_employee,
                    latitude=lat,
                    longitude=lng,
                    photo=photo,
                    check_out_time=check_time,
                    date=check_date
                )
            else:
                attendance = AttendanceService.process_clock_in(
                    employee=target_employee,
                    latitude=lat,
                    longitude=lng,
                    photo=photo,
                    check_in_time=check_time,
                    date=check_date
                )
            
            # Perform manual audit tracing since we bypassed DRF Serializer
            if attendance.created_by is None:
                attendance.created_by = user
            attendance.updated_by = user
            attendance.save()
            
            serializer = self.get_serializer(attendance)
            return Response(serializer.data, status=status.HTTP_201_CREATED if not check_out_str else status.HTTP_200_OK)

        return super().create(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def download_pdf(self, request):
        from .pdf_generator import AttendancePDFGenerator
        from django.http import HttpResponse
        
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        target_employee_id = request.query_params.get('employee_id')
        
        if not (month and year):
            return Response({'error': 'Month and year are required.'}, status=400)

        # Permission check
        if target_employee_id:
            is_manager = user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('tenant_manage_attendance'))
            if not is_manager:
                return Response({'error': 'Permission denied.'}, status=403)
            target_employee = Employee.objects.get(id=target_employee_id)
        else:
            target_employee = employee

        if not target_employee:
            return Response({'error': 'Employee profile not found.'}, status=404)

        attendance_records = Attendance.objects.filter(
            employee=target_employee,
            date__month=month,
            date__year=year
        ).order_by('date')

        from django.db import connection
        generator = AttendancePDFGenerator(connection.tenant.name)
        pdf_content = generator.generate_individual_report(target_employee, month, year, attendance_records)
        
        response = HttpResponse(pdf_content, content_type='application/pdf')
        filename = f"Attendance_{target_employee.nik}_{month}_{year}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=False, methods=['get'])
    def export_xlsx(self, request):
        import pandas as pd
        from io import BytesIO
        from django.http import HttpResponse
        from django.utils import timezone
        
        queryset = self.filter_queryset(self.get_queryset())
        data = []
        for att in queryset:
            data.append({
                'Employee': att.employee.fullname,
                'Date': att.date,
                'Check In': att.check_in,
                'Check Out': att.check_out,
                'Status': att.status,
                'Late (Min)': att.late_minutes,
                'Total Hours': att.total_hours
            })
            
        df = pd.DataFrame(data)
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Attendance')
            
        response = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="Attendance_Recap_{timezone.now().strftime("%Y%m%d")}.xlsx"'
        return response

    @action(detail=False, methods=['get'])
    def export_summary_pdf(self, request):
        from .pdf_generator import AttendancePDFGenerator
        from django.http import HttpResponse
        from django.db.models import Count, Q
        
        # Security: Only allow managers/staff to export full reports
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        is_manager = user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('tenant_manage_attendance'))
        
        if not is_manager:
            return Response({'detail': 'Permission denied.'}, status=403)

        month = request.query_params.get('month')
        year = request.query_params.get('year')
        
        if not (month and year):
            return Response({'error': 'Month and year are required.'}, status=400)
            
        stats = Attendance.objects.filter(
            date__month=month, 
            date__year=year
        ).values('employee__fullname', 'employee__nik').annotate(
            total_present=Count('id', filter=Q(status='PRESENT')),
            total_late=Count('id', filter=Q(status='LATE')),
            total_offsite=Count('id', filter=Q(status='OFF_SITE')),
            total_absent=Count('id', filter=Q(status='ABSENT')),
        )

        from django.db import connection
        generator = AttendancePDFGenerator(connection.tenant.name)
        pdf_content = generator.generate_summary_report(month, year, stats)
        
        response = HttpResponse(pdf_content, content_type='application/pdf')
        filename = f"Attendance_Summary_{month}_{year}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        import csv
        from django.http import HttpResponse
        from django.db.models import Count, Q
        
        # Security: Only allow managers/staff to export full reports
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        is_manager = user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('tenant_manage_attendance'))
        
        if not is_manager:
            return Response({'detail': 'Permission denied. Only managers can export reports.'}, status=403)

        month = request.query_params.get('month')
        year = request.query_params.get('year')
        
        if not (month and year):
            return Response({'error': 'Month and year are required.'}, status=400)
            
        # Aggregate stats per employee for the given month/year
        stats = Attendance.objects.filter(
            date__month=month, 
            date__year=year
        ).values('employee__fullname', 'employee__nik').annotate(
            total_present=Count('id', filter=Q(status='PRESENT')),
            total_late=Count('id', filter=Q(status='LATE')),
            total_offsite=Count('id', filter=Q(status='OFF_SITE')),
            total_absent=Count('id', filter=Q(status='ABSENT')),
        )
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="attendance_recap_{month}_{year}.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Employee Name', 'NIK', 'Present', 'Late', 'Off-site', 'Absent'])
        
        for s in stats:
            writer.writerow([
                s['employee__fullname'], s['employee__nik'],
                s['total_present'], s['total_late'], 
                s['total_offsite'], s['total_absent']
            ])
            
        return response

    @action(detail=False, methods=['post'], url_path='check-absences')
    def check_absences(self, request):
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        is_manager = user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('tenant_manage_attendance'))
        
        if not is_manager:
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
            
        date_str = request.data.get('date')
        from attendance.tasks import check_absences_for_all_tenants
        result = check_absences_for_all_tenants(date_str=date_str)
        return Response({'status': 'success', 'result': result}, status=status.HTTP_200_OK)

    def perform_update(self, serializer):
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        is_manager = user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('tenant_manage_attendance'))

        if not is_manager:
            instance = serializer.instance
            # Fields always restricted for non-managers
            restricted_fields = ['status', 'date', 'employee', 'is_out_of_bounds', 'distance_from_branch']
            for field in restricted_fields:
                if field in self.request.data:
                    serializer.validated_data.pop(field, None)

            # Restrict editing check_in/check_out if already set (requires approval request)
            if 'check_in' in self.request.data and instance.check_in is not None:
                serializer.validated_data.pop('check_in', None)
            
            if 'check_out' in self.request.data and instance.check_out is not None:
                serializer.validated_data.pop('check_out', None)

        instance = serializer.save(updated_by=user)
        from core.audit import AuditLogger
        AuditLogger.log_change('UPDATE', instance, actor=user)


from core.services import WorkflowService

class LeaveRequestViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
    queryset = LeaveRequest.objects.all()
    serializer_class = LeaveRequestSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantRBACPermission, FeatureRequiredPermission]
    required_rbac_permission = 'tenant_manage_attendance'
    required_feature = 'attendance'
    allow_self_service = True
    allow_self_service_list = True

    def get_queryset(self):
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        
        # Admin/HR can see everything
        if user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('tenant_manage_attendance')):
            return LeaveRequest.objects.all()
            
        # Supervisors can see their own + subordinates
        if employee:
            from django.db.models import Q
            return LeaveRequest.objects.filter(Q(employee=employee) | Q(employee__supervisor=employee))
            
        return LeaveRequest.objects.none()

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Explicitly return refreshed data to ensure workflow status is reflected
        instance.refresh_from_db()
        data = self.get_serializer(instance).data
        return Response(data)

    def perform_create(self, serializer):
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        is_manager = user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('tenant_manage_attendance'))
        
        target_employee = employee
        if is_manager and self.request.data.get('employee'):
            target_employee = Employee.objects.get(id=self.request.data.get('employee'))

        if target_employee and serializer.validated_data.get('leave_type') == 'CUTI':
            # Basic validation for annual leave
            start_date = serializer.validated_data.get('start_date')
            end_date = serializer.validated_data.get('end_date')
            duration = (end_date - start_date).days + 1
            
            balance, _ = LeaveBalance.objects.get_or_create(
                employee=target_employee, 
                year=start_date.year
            )
            
            if balance.remaining_days < duration:
                raise serializers.ValidationError({"error": f"Insufficient leave balance. Remaining: {balance.remaining_days} days."})

        # Save instance first
        instance = serializer.save(employee=target_employee if is_manager else employee)
        # Initialize Workflow
        WorkflowService.initialize_workflow(instance)

    def perform_update(self, serializer):
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        
        user_choice = self.request.data.get('action') or self.request.data.get('status')
        comment = self.request.data.get('comment', '')
        
        # Always save first to handle other field changes and set updated_by
        instance = serializer.save(updated_by=user)

        if user_choice in ['APPROVED', 'REJECTED', 'RETURNED']:
            # Use WorkflowService to handle transition
            WorkflowService.process_action(instance, employee, user_choice, comment)
            # Re-read from DB to get the final status after workflow processing
            instance.refresh_from_db()
            # Clear serializer cache to ensure the response reflects the refresh
            if hasattr(serializer, '_data'):
                del serializer._data

            # Deduction Logic: When FINAL status moves to APPROVED
            if instance.status == 'APPROVED' and instance.leave_type == 'CUTI':
                duration = (instance.end_date - instance.start_date).days + 1
                balance, _ = LeaveBalance.objects.get_or_create(
                    employee=instance.employee, 
                    year=instance.start_date.year
                )
                balance.used_days += Decimal(str(duration))
                balance.save()


class OvertimeViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
    queryset = Overtime.objects.all()
    serializer_class = OvertimeSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantRBACPermission, FeatureRequiredPermission]
    required_rbac_permission = 'tenant_manage_attendance'
    required_feature = 'attendance'
    allow_self_service = True
    allow_self_service_list = True

    def get_queryset(self):
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        
        if user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('tenant_manage_attendance')):
            return Overtime.objects.all()
            
        if employee:
            from django.db.models import Q
            return Overtime.objects.filter(Q(employee=employee) | Q(employee__supervisor=employee))
        return Overtime.objects.none()

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        instance.refresh_from_db()
        return Response(self.get_serializer(instance).data)

    def perform_create(self, serializer):
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        inst = serializer.save(employee=employee)
        WorkflowService.initialize_workflow(inst)

    def perform_update(self, serializer):
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        user_choice = self.request.data.get('action') or self.request.data.get('status')
        comment = self.request.data.get('comment', '')
        
        instance = serializer.save(updated_by=user)

        if user_choice in ['APPROVED', 'REJECTED', 'RETURNED']:
            WorkflowService.process_action(instance, employee, user_choice, comment)
            instance.refresh_from_db()
            if hasattr(serializer, '_data'):
                del serializer._data


class ShiftViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
    queryset = Shift.objects.all()
    serializer_class = ShiftSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantRBACPermission, FeatureRequiredPermission]
    required_rbac_permission = 'tenant_manage_attendance'
    required_feature = 'attendance'


class ScheduleViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
    queryset = Schedule.objects.all()
    serializer_class = ScheduleSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantRBACPermission, FeatureRequiredPermission]
    required_rbac_permission = 'tenant_manage_attendance'
    required_feature = 'attendance'
    allow_self_service = True
    allow_self_service_list = True

    def get_queryset(self):
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        
        # Managers see all schedules
        if user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('tenant_manage_attendance')):
            queryset = Schedule.objects.all()
        elif employee:
            # Employees only see their own schedules
            queryset = Schedule.objects.filter(employee=employee)
        else:
            return Schedule.objects.none()

        employee_id = self.request.query_params.get('employee_id')
        date_param = self.request.query_params.get('date')
        if employee_id and (user.is_staff or employee.access_role.permissions.get('tenant_manage_attendance')):
            queryset = queryset.filter(employee_id=employee_id)
        if date_param:
            queryset = queryset.filter(date=date_param)
        return queryset
class LeaveBalanceViewSet(TenantIsolationMixin, viewsets.ReadOnlyModelViewSet):
    queryset = LeaveBalance.objects.all()
    serializer_class = LeaveBalanceSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantRBACPermission, FeatureRequiredPermission]
    required_rbac_permission = 'tenant_manage_attendance'
    required_feature = 'attendance'
    allow_self_service = True
    allow_self_service_list = True

    def get_queryset(self):
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        
        if user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('tenant_manage_attendance')):
            return LeaveBalance.objects.all()
            
        if employee:
            return LeaveBalance.objects.filter(employee=employee)
        return LeaveBalance.objects.none()


class AttendanceCorrectionRequestViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
    queryset = AttendanceCorrectionRequest.objects.all()
    serializer_class = AttendanceCorrectionRequestSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantRBACPermission, FeatureRequiredPermission]
    required_rbac_permission = 'tenant_manage_attendance'
    required_feature = 'attendance'
    allow_self_service = True
    allow_self_service_list = True

    def get_queryset(self):
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        
        if user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('tenant_manage_attendance')):
            return AttendanceCorrectionRequest.objects.all()
            
        if employee:
            from django.db.models import Q
            return AttendanceCorrectionRequest.objects.filter(Q(employee=employee) | Q(employee__supervisor=employee))
        return AttendanceCorrectionRequest.objects.none()

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        instance.refresh_from_db()
        return Response(self.get_serializer(instance).data)

    def perform_create(self, serializer):
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        if not employee:
             raise serializers.ValidationError({"detail": "Employee profile required."})
        
        # Auto-assign the requesting employee
        instance = serializer.save(employee=employee)
        WorkflowService.initialize_workflow(instance)

    def perform_update(self, serializer):
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        
        user_choice = self.request.data.get('action') or self.request.data.get('status')
        comment = self.request.data.get('comment', '')
        
        instance = serializer.save(updated_by=user)

        if user_choice in ['APPROVED', 'REJECTED', 'RETURNED']:
            WorkflowService.process_action(instance, employee, user_choice, comment)
            instance.refresh_from_db()
            if hasattr(serializer, '_data'):
                del serializer._data

        # Apply Correction: When FINAL status moves to APPROVED
        instance.refresh_from_db()
        if instance.status == 'APPROVED':
            with transaction.atomic():
                attendance = instance.attendance
                if instance.requested_check_in:
                    attendance.check_in = instance.requested_check_in
                if instance.requested_check_out:
                    attendance.check_out = instance.requested_check_out
                attendance.save()
                
                # Re-calculate status (LATE etc) after time correction
                AttendanceService.recalculate_attendance_status(attendance)
                
                from core.audit import AuditLogger
                AuditLogger.log_change('UPDATE', attendance, actor=user)


class FingerprintDeviceViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
    queryset = FingerprintDevice.objects.all()
    serializer_class = FingerprintDeviceSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantRBACPermission, FeatureRequiredPermission]
    required_rbac_permission = 'tenant_manage_attendance'
    required_feature = 'attendance'

    @action(detail=False, methods=['post'], url_path='import-logs')
    def import_logs(self, request):
        from django.db import connection
        from django_tenants.utils import get_tenant_model
        from django.utils import timezone
        
        tenant = get_tenant_model().objects.get(schema_name=connection.schema_name)
        if not getattr(tenant, 'is_fingerprint_enabled', False):
            return Response(
                {'error': 'Fingerprint integration is disabled by tenant policy.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
            
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file uploaded under key "file".'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            import pandas as pd
            # Read excel
            df = pd.read_excel(file_obj)
            
            # Normalize column names to lowercase for flexibility
            df.columns = [str(c).strip().lower() for c in df.columns]
            
            # Find column mapping
            pin_col = None
            for col in ['biometric_pin', 'pin', 'enrollment_id', 'pin_biometric']:
                if col in df.columns:
                    pin_col = col
                    break
            
            ts_col = None
            for col in ['timestamp', 'time', 'waktu', 'datetime', 'tanggal']:
                if col in df.columns:
                    ts_col = col
                    break
                    
            state_col = None
            for col in ['in_out_state', 'state', 'status', 'tipe']:
                if col in df.columns:
                    state_col = col
                    break

            serial_col = None
            for col in ['device_serial', 'serial', 'device']:
                if col in df.columns:
                    serial_col = col
                    break
                    
            if not pin_col or not ts_col:
                return Response({
                    'error': 'Excel file must contain at least "biometric_pin" (or "pin") and "timestamp" (or "time") columns.'
                }, status=status.HTTP_400_BAD_REQUEST)
                
            inserted_count = 0
            for _, row in df.iterrows():
                biometric_pin = str(row[pin_col]).strip()
                # Remove decimal point if pandas read it as float
                if biometric_pin.endswith('.0'):
                    biometric_pin = biometric_pin[:-2]
                    
                raw_ts = row[ts_col]
                if pd.isna(raw_ts) or not biometric_pin:
                    continue
                    
                try:
                    # Convert to datetime and make it aware if naive
                    timestamp = pd.to_datetime(raw_ts)
                    if timestamp.tzinfo is None:
                        timestamp = timezone.make_aware(timestamp, timezone.get_current_timezone())
                except Exception:
                    continue
                    
                # Parse state
                in_out_state = 'AUTO'
                if state_col and not pd.isna(row[state_col]):
                    val = str(row[state_col]).strip().upper()
                    if 'IN' in val or 'MASUK' in val:
                        in_out_state = 'IN'
                    elif 'OUT' in val or 'KELUAR' in val:
                        in_out_state = 'OUT'
                        
                # Find device
                device = None
                if serial_col and not pd.isna(row[serial_col]):
                    serial = str(row[serial_col]).strip()
                    device = FingerprintDevice.objects.filter(serial_number=serial, is_active=True).first()
                
                # If no specific device is matched, try to find any active device, or leave it None
                if not device:
                    device = FingerprintDevice.objects.filter(is_active=True).first()
                    
                log_obj, created = DeviceAttendanceLog.objects.update_or_create(
                    biometric_pin=biometric_pin,
                    timestamp=timestamp,
                    defaults={
                        'device': device,
                        'verification_mode': 1,
                        'in_out_state': in_out_state,
                        'is_processed': False
                    }
                )
                if created:
                    inserted_count += 1
                    
            processed_count = AttendanceService.process_device_logs()
            
            return Response({
                'status': 'success',
                'received': len(df),
                'inserted': inserted_count,
                'processed': processed_count
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({'error': f'Failed to process file: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)



from core.authentication import APIKeyAuthentication
from django.db import connection
from django_tenants.utils import get_tenant_model

class DeviceAttendanceLogViewSet(viewsets.ModelViewSet):
    queryset = DeviceAttendanceLog.objects.all()
    serializer_class = DeviceAttendanceLogSerializer
    authentication_classes = [APIKeyAuthentication] + list(viewsets.ModelViewSet.authentication_classes)
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        # Enforce tenant settings check
        tenant = get_tenant_model().objects.get(schema_name=connection.schema_name)
        if not getattr(tenant, 'is_fingerprint_enabled', False):
            return Response(
                {'error': 'Fingerprint integration is disabled by tenant policy.'}, 
                status=status.HTTP_403_FORBIDDEN
            )

        device_serial = request.data.get('device_serial')
        logs_data = request.data.get('logs', [])

        if not device_serial:
            return Response({'error': 'device_serial is required.'}, status=status.HTTP_400_BAD_REQUEST)

        device = FingerprintDevice.objects.filter(serial_number=device_serial, is_active=True).first()
        if not device:
            return Response({'error': f'Device with serial {device_serial} is not registered or active.'}, status=status.HTTP_400_BAD_REQUEST)

        inserted_count = 0
        for log_item in logs_data:
            biometric_pin = log_item.get('biometric_pin')
            timestamp_str = log_item.get('timestamp')
            verification_mode = log_item.get('verification_mode', 1)
            in_out_state = log_item.get('in_out_state', 'AUTO')

            if not biometric_pin or not timestamp_str:
                continue

            try:
                # Support various datetime formats (like timezone offset +07:00 or Z)
                # datetime.fromisoformat supports offset since Python 3.7
                cleaned_ts = timestamp_str.replace('Z', '+00:00')
                timestamp = datetime.fromisoformat(cleaned_ts)
                
                log_obj, created = DeviceAttendanceLog.objects.update_or_create(
                    biometric_pin=biometric_pin,
                    timestamp=timestamp,
                    defaults={
                        'device': device,
                        'verification_mode': verification_mode,
                        'in_out_state': in_out_state,
                        'is_processed': False
                    }
                )
                if created:
                    inserted_count += 1
            except Exception as e:
                pass

        processed_count = AttendanceService.process_device_logs()

        return Response({
            'status': 'success',
            'received': len(logs_data),
            'inserted': inserted_count,
            'processed': processed_count
        }, status=status.HTTP_201_CREATED)
