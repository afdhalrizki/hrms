import math
from datetime import date, datetime
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from django.core.cache import cache
from core.audit import AuditModelMixin
from core.permissions import HasRBACPermission
# Using absolute import from core
from core.models import Employee
from .models import Attendance, LeaveRequest, Overtime, Shift, Schedule
from .serializers import (
    AttendanceSerializer, LeaveRequestSerializer, OvertimeSerializer,
    ShiftSerializer, ScheduleSerializer
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
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_rbac_permission = 'manage_attendance'

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
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_rbac_permission = 'manage_attendance'

    def get_queryset(self):
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        
        if user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('manage_attendance')):
            return LeaveRequest.objects.all()
            
        if employee:
            return LeaveRequest.objects.filter(employee=employee)
        return LeaveRequest.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        is_manager = user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('manage_attendance'))
        
        if not is_manager and employee:
            serializer.save(employee=employee)
        else:
            serializer.save()


class OvertimeViewSet(AuditModelMixin, viewsets.ModelViewSet):
    queryset = Overtime.objects.all()
    serializer_class = OvertimeSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_rbac_permission = 'manage_attendance'

    def get_queryset(self):
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        
        if user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('manage_attendance')):
            return Overtime.objects.all()
            
        if employee:
            return Overtime.objects.filter(employee=employee)
        return Overtime.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        is_manager = user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('manage_attendance'))
        
        if not is_manager and employee:
            serializer.save(employee=employee)
        else:
            serializer.save()


class ShiftViewSet(AuditModelMixin, viewsets.ModelViewSet):
    queryset = Shift.objects.all()
    serializer_class = ShiftSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_rbac_permission = 'manage_settings'


class ScheduleViewSet(AuditModelMixin, viewsets.ModelViewSet):
    queryset = Schedule.objects.all()
    serializer_class = ScheduleSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_rbac_permission = 'manage_attendance'

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
