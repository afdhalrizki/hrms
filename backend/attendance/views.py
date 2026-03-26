import math
from decimal import Decimal
from datetime import date, datetime
from django.db import transaction
from rest_framework import viewsets, permissions, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.cache import cache
from core.audit import AuditModelMixin
from core.permissions import HasRBACPermission, FeatureRequiredPermission
# Using absolute import from core
from core.models import Employee
from .models import Attendance, LeaveRequest, Overtime, Shift, Schedule, LeaveBalance, AttendanceCorrectionRequest
from .serializers import (
    AttendanceSerializer, LeaveRequestSerializer, OvertimeSerializer,
    ShiftSerializer, ScheduleSerializer, LeaveBalanceSerializer,
    AttendanceCorrectionRequestSerializer
)


from .services import AttendanceService

# ── ViewSets ────────────────────────────────────────────────────────────────
class AttendanceViewSet(AuditModelMixin, viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission, FeatureRequiredPermission]
    required_rbac_permission = 'manage_attendance'
    required_feature = 'attendance'
    allow_self_service = True

    def get_queryset(self):
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        
        # Managers and Staff see everything
        if user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('manage_attendance')):
            queryset = Attendance.objects.all()
            employee_id = self.request.query_params.get('employee_id')
            if employee_id:
                queryset = queryset.filter(employee_id=employee_id)
            return queryset
            
        # Regular employees only see their own records
        if employee:
            return Attendance.objects.filter(employee=employee)
        return Attendance.objects.none()

    def perform_create(self, serializer):
        """Automatically assign the employee to the current folder user if not manager."""
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        
        # If user is not a manager, they can only create attendance for themselves
        is_manager = user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('manage_attendance'))
        
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

        # Allow managers to specify target employee
        target_employee = employee
        if request.data.get('employee'):
            is_manager = user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('manage_attendance'))
            if is_manager:
                target_employee_id = request.data.get('employee')
                if isinstance(target_employee_id, dict):
                    target_employee_id = target_employee_id.get('id')
                target_employee = Employee.objects.get(id=target_employee_id)

        lat = request.data.get('latitude_in')
        lng = request.data.get('longitude_in')
        photo = request.data.get('photo_in')

        if lat and lng:
            if not target_employee:
                return Response({'error': 'Target employee record not found.'}, status=status.HTTP_400_BAD_REQUEST)

            check_in_str = request.data.get('check_in')
            date_str = request.data.get('date')
            
            check_in_time = None
            if check_in_str:
                 check_in_time = datetime.strptime(check_in_str, '%H:%M:%S').time()
            
            check_date = None
            if date_str:
                 check_date = datetime.strptime(date_str, '%Y-%m-%d').date()

            attendance = AttendanceService.process_clock_in(
                employee=target_employee,
                latitude=lat,
                longitude=lng,
                photo=photo,
                check_in_time=check_in_time,
                date=check_date
            )
            # Perform manual audit tracing since we bypassed DRF Serializer
            if attendance.created_by is None:
                attendance.created_by = user
            attendance.updated_by = user
            attendance.save(update_fields=['created_by', 'updated_by'])
            
            serializer = self.get_serializer(attendance)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return super().create(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        import csv
        from django.http import HttpResponse
        from django.db.models import Count, Q
        
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

    def perform_update(self, serializer):
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        is_manager = user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('manage_attendance'))

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

class LeaveRequestViewSet(AuditModelMixin, viewsets.ModelViewSet):
    queryset = LeaveRequest.objects.all()
    serializer_class = LeaveRequestSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission, FeatureRequiredPermission]
    required_rbac_permission = 'manage_attendance'
    required_feature = 'attendance'
    allow_self_service = True

    def get_queryset(self):
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        
        # Admin/HR can see everything
        if user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('manage_attendance')):
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
        print(f"DEBUG: LeaveRequest updated, final status in DB: {instance.status}, in response: {data['status']}")
        return Response(data)

    def perform_create(self, serializer):
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        is_manager = user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('manage_attendance'))
        
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


class OvertimeViewSet(AuditModelMixin, viewsets.ModelViewSet):
    queryset = Overtime.objects.all()
    serializer_class = OvertimeSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission, FeatureRequiredPermission]
    required_rbac_permission = 'manage_attendance'
    required_feature = 'attendance'
    allow_self_service = True

    def get_queryset(self):
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        
        if user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('manage_attendance')):
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


class ShiftViewSet(AuditModelMixin, viewsets.ModelViewSet):
    queryset = Shift.objects.all()
    serializer_class = ShiftSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission, FeatureRequiredPermission]
    required_rbac_permission = 'manage_settings'
    required_feature = 'attendance'


class ScheduleViewSet(AuditModelMixin, viewsets.ModelViewSet):
    queryset = Schedule.objects.all()
    serializer_class = ScheduleSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission, FeatureRequiredPermission]
    required_rbac_permission = 'manage_attendance'
    required_feature = 'attendance'

    def get_queryset(self):
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        
        # Managers see all schedules
        if user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('manage_attendance')):
            queryset = Schedule.objects.all()
        elif employee:
            # Employees only see their own schedules
            queryset = Schedule.objects.filter(employee=employee)
        else:
            return Schedule.objects.none()

        employee_id = self.request.query_params.get('employee_id')
        date_param = self.request.query_params.get('date')
        if employee_id and (user.is_staff or employee.access_role.permissions.get('manage_attendance')):
            queryset = queryset.filter(employee_id=employee_id)
        if date_param:
            queryset = queryset.filter(date=date_param)
        return queryset
class LeaveBalanceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LeaveBalance.objects.all()
    serializer_class = LeaveBalanceSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission, FeatureRequiredPermission]
    required_rbac_permission = 'manage_attendance'
    required_feature = 'attendance'

    def get_queryset(self):
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        
        if user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('manage_attendance')):
            return LeaveBalance.objects.all()
            
        if employee:
            return LeaveBalance.objects.filter(employee=employee)
        return LeaveBalance.objects.none()


class AttendanceCorrectionRequestViewSet(AuditModelMixin, viewsets.ModelViewSet):
    queryset = AttendanceCorrectionRequest.objects.all()
    serializer_class = AttendanceCorrectionRequestSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission, FeatureRequiredPermission]
    required_rbac_permission = 'manage_attendance'
    required_feature = 'attendance'
    allow_self_service = True

    def get_queryset(self):
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        
        if user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('manage_attendance')):
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
                
                # Re-calculate status (LATE etc) if needed? 
                # For now just save the requested times.
                from core.audit import AuditLogger
                AuditLogger.log_change('UPDATE', attendance, actor=user)
