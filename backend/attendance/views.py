import math
from decimal import Decimal
from datetime import date, datetime
from rest_framework import viewsets, permissions, status, serializers
from rest_framework.response import Response
from django.core.cache import cache
from core.audit import AuditModelMixin
from core.permissions import HasRBACPermission, FeatureRequiredPermission
# Using absolute import from core
from core.models import Employee
from .models import Attendance, LeaveRequest, Overtime, Shift, Schedule, LeaveBalance
from .serializers import (
    AttendanceSerializer, LeaveRequestSerializer, OvertimeSerializer,
    ShiftSerializer, ScheduleSerializer, LeaveBalanceSerializer
)


# ── Geofencing helpers ──────────────────────────────────────────────────────
OFFICE_LAT = -6.2088   # Default: Jakarta Pusat – override per company in admin
OFFICE_LNG = 106.8456
GEOFENCE_RADIUS_M = 100  # Must be within 100 metres to clock in


def haversine_distance(lat1, lon1, lat2, lon2):
    """Return distance in metres between two GPS coordinates."""
    R = 6_371_000  # Earth radius in metres
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ── ViewSets ────────────────────────────────────────────────────────────────
class AttendanceViewSet(AuditModelMixin, viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission, FeatureRequiredPermission]
    required_rbac_permission = 'manage_attendance'
    required_feature = 'attendance'

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
            serializer.save(employee=employee)
        else:
            serializer.save()

    def create(self, request, *args, **kwargs):
        """Override create to enforce geofencing and automatic shift-based status."""
        lat = request.data.get('latitude_in') # Fixed field name from model
        lng = request.data.get('longitude_in')

        if lat is not None and lng is not None:
            try:
                lat, lng = float(lat), float(lng)
            except (TypeError, ValueError):
                return Response(
                    {'error': 'Invalid GPS coordinates provided.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Fetch office coordinates from cache
            cache_key = 'office_location'
            office = cache.get(cache_key)
            if office is None:
                office = (OFFICE_LAT, OFFICE_LNG)
                cache.set(cache_key, office, timeout=3600)

            distance = haversine_distance(lat, lng, office[0], office[1])
            if distance > GEOFENCE_RADIUS_M:
                return Response(
                    {
                        'error': 'Geofencing violation: you are too far from the office.',
                        'distance_m': round(distance, 1),
                        'allowed_radius_m': GEOFENCE_RADIUS_M,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # ── Automatic Status Determination based on Shift ──
        employee_id = request.data.get('employee')
        # If employee_id is not provided, use the currently logged in employee
        if not employee_id:
            employee = Employee.objects.filter(email=request.user.email).first()
            employee_id = employee.id if employee else None

        check_in_str = request.data.get('check_in')
        
        if employee_id and check_in_str:
            today = date.today()
            try:
                # Standard format check
                check_in_time = datetime.strptime(check_in_str, '%H:%M:%S').time()
            except ValueError:
                try:
                    check_in_time = datetime.strptime(check_in_str, '%H:%M').time()
                except ValueError:
                    check_in_time = datetime.now().time()

            schedule = Schedule.objects.filter(employee_id=employee_id, date=today).select_related('shift').first()
            
            if schedule:
                shift = schedule.shift
                if check_in_time > shift.start_time:
                    request.data['status'] = 'LATE'
                else:
                    request.data['status'] = 'PRESENT'
            else:
                # Default 08:00 fallback if no schedule assigned
                default_start = datetime.strptime('08:00', '%H:%M:%S').time()
                if check_in_time > default_start:
                    request.data['status'] = 'LATE'
                else:
                    request.data['status'] = 'PRESENT'

        return super().create(request, *args, **kwargs)


class LeaveRequestViewSet(AuditModelMixin, viewsets.ModelViewSet):
    queryset = LeaveRequest.objects.all()
    serializer_class = LeaveRequestSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission, FeatureRequiredPermission]
    required_rbac_permission = 'manage_attendance'
    required_feature = 'attendance'

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

        if not is_manager and employee:
            serializer.save(employee=employee)
        else:
            serializer.save()

    def perform_update(self, serializer):
        from django.db import connection
        instance = self.get_object()
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        tenant = connection.tenant
        
        new_supervisor_status = instance.supervisor_status
        new_hr_status = instance.hr_status
        user_choice = self.request.data.get('status')
        
        if not user_choice:
            serializer.save()
            return

        # Determine if user is acting as Supervisor or HR
        is_hr = user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('manage_attendance'))
        is_supervisor = employee and instance.employee.supervisor == employee
        
        # If user is both, prioritize HR for global changes, or handle specifically
        if is_supervisor and user_choice in ['APPROVED', 'REJECTED']:
            new_supervisor_status = user_choice
        
        if is_hr and user_choice in ['APPROVED', 'REJECTED']:
            new_hr_status = user_choice

        # Logic for final status
        final_status = 'PENDING'
        level = getattr(tenant, 'leave_approval_level', 'HR')
        
        if user_choice == 'REJECTED':
            final_status = 'REJECTED'
        else:
            if level == 'SUPERVISOR':
                final_status = new_supervisor_status
            elif level == 'HR':
                final_status = new_hr_status
            elif level == 'BOTH':
                if new_supervisor_status == 'APPROVED' and new_hr_status == 'APPROVED':
                    final_status = 'APPROVED'
                elif new_supervisor_status == 'REJECTED' or new_hr_status == 'REJECTED':
                    final_status = 'REJECTED'
                else:
                    final_status = 'PENDING'

        # Deduction Logic: When FINAL status moves to APPROVED
        if instance.status != 'APPROVED' and final_status == 'APPROVED' and instance.leave_type == 'CUTI':
            duration = (instance.end_date - instance.start_date).days + 1
            balance, _ = LeaveBalance.objects.get_or_create(
                employee=instance.employee, 
                year=instance.start_date.year
            )
            balance.used_days += Decimal(str(duration))
            balance.save()
        
        serializer.save(
            status=final_status,
            supervisor_status=new_supervisor_status,
            hr_status=new_hr_status
        )


class OvertimeViewSet(AuditModelMixin, viewsets.ModelViewSet):
    queryset = Overtime.objects.all()
    serializer_class = OvertimeSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission, FeatureRequiredPermission]
    required_rbac_permission = 'manage_attendance'
    required_feature = 'attendance'

    def get_queryset(self):
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        
        if user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('manage_attendance')):
            return Overtime.objects.all()
            
        if employee:
            from django.db.models import Q
            return Overtime.objects.filter(Q(employee=employee) | Q(employee__supervisor=employee))
        return Overtime.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        is_manager = user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('manage_attendance'))
        
        if not is_manager and employee:
            serializer.save(employee=employee)
        else:
            serializer.save()

    def perform_update(self, serializer):
        from django.db import connection
        instance = self.get_object()
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        tenant = connection.tenant
        
        new_supervisor_status = instance.supervisor_status
        new_hr_status = instance.hr_status
        user_choice = self.request.data.get('status')
        
        if not user_choice:
            serializer.save()
            return

        is_hr = user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('manage_attendance'))
        is_supervisor = employee and instance.employee.supervisor == employee
        
        if is_supervisor and user_choice in ['APPROVED', 'REJECTED']:
            new_supervisor_status = user_choice
        
        if is_hr and user_choice in ['APPROVED', 'REJECTED']:
            new_hr_status = user_choice

        # Logic for final status
        final_status = 'PENDING'
        level = getattr(tenant, 'overtime_approval_level', 'BOTH')
        
        if user_choice == 'REJECTED':
            final_status = 'REJECTED'
        else:
            if level == 'SUPERVISOR':
                final_status = new_supervisor_status
            elif level == 'HR':
                final_status = new_hr_status
            elif level == 'BOTH':
                if new_supervisor_status == 'APPROVED' and new_hr_status == 'APPROVED':
                    final_status = 'APPROVED'
                elif new_supervisor_status == 'REJECTED' or new_hr_status == 'REJECTED':
                    final_status = 'REJECTED'
                else:
                    final_status = 'PENDING'
        
        serializer.save(
            status=final_status,
            supervisor_status=new_supervisor_status,
            hr_status=new_hr_status
        )


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
