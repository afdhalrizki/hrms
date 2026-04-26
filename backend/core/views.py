import logging
from rest_framework import viewsets, permissions, status, views
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Count, Sum
from datetime import date, timedelta
from django.utils import timezone
from core.audit import AuditModelMixin
from core.permissions import HasRBACPermission
from .models import (
    Department, Role, Golongan, Employee, AccessRole,
    Branch, WorkflowConfig, WorkflowStage, WorkflowAction,
    APIKey, AuditLog
)
from .serializers import (
    DepartmentSerializer, RoleSerializer, GolonganSerializer, 
    EmployeeSerializer, AccessRoleSerializer,
    BranchSerializer, WorkflowConfigSerializer, 
    WorkflowStageSerializer, WorkflowActionSerializer,
    APIKeySerializer, AuditLogSerializer
)
from core.mixins import TenantIsolationMixin

logger = logging.getLogger(__name__)

class APIKeyViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
    queryset = APIKey.objects.all()
    serializer_class = APIKeySerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_rbac_permission = 'manage_settings'

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return APIKey.objects.all()
            
        employee = getattr(user, 'employee', None)
        if not employee:
            from .models import Employee
            employee = Employee.objects.filter(email=user.email).first()
            
        if employee and employee.access_role and employee.access_role.permissions.get('manage_settings'):
            return APIKey.objects.all()
        return APIKey.objects.none()


class AuditLogViewSet(TenantIsolationMixin, viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_rbac_permission = 'view_audit_logs'

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return AuditLog.objects.all()
            
        employee = getattr(user, 'employee', None)
        if not employee:
            from .models import Employee
            employee = Employee.objects.filter(email=user.email).first()
            
        if employee and employee.access_role and employee.access_role.permissions.get('view_audit_logs'):
            return AuditLog.objects.all()
            
        # Raise 403 instead of returning empty list to be strict with audit logs
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied("You do not have permission to view audit logs.")


class BranchViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_rbac_permission = 'manage_hr'


class WorkflowConfigViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
    queryset = WorkflowConfig.objects.all()
    serializer_class = WorkflowConfigSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_rbac_permission = 'manage_settings'


class WorkflowStageViewSet(AuditModelMixin, viewsets.ModelViewSet):
    queryset = WorkflowStage.objects.all()
    serializer_class = WorkflowStageSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_rbac_permission = 'manage_settings'


class WorkflowActionViewSet(AuditModelMixin, viewsets.ReadOnlyModelViewSet):
    queryset = WorkflowAction.objects.all()
    serializer_class = WorkflowActionSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_rbac_permission = 'manage_attendance' # Actors need this to see history


class DepartmentViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_rbac_permission = 'manage_hr'


class RoleViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_rbac_permission = 'manage_hr'


class GolonganViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
    queryset = Golongan.objects.all()
    serializer_class = GolonganSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_rbac_permission = 'manage_hr'


class AccessRoleViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
    queryset = AccessRole.objects.all()
    serializer_class = AccessRoleSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_rbac_permission = 'manage_access_roles'


class EmployeeViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
    queryset = Employee.objects.none()
    serializer_class = EmployeeSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_rbac_permission = 'manage_hr'
    allow_self_service = True

    def get_queryset(self):
        from django.db import connection
        # with connection.cursor() as cursor:
        #     cursor.execute("SHOW search_path")
        #     sp = cursor.fetchone()
        # print(f"DEBUG VIEW: Path={self.request.path} Schema={connection.schema_name} SP={sp}")
        
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()

        # Managers/HR see everyone
        if user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('manage_hr')):
            queryset = Employee.objects.all().select_related(
                'department', 'role', 'role__department', 'golongan', 'branch', 'access_role', 'supervisor'
            )
            dept_id = self.request.query_params.get('department')
            if dept_id:
                queryset = queryset.filter(department_id=dept_id)
            return queryset
            
        # Employees can only see themselves
        if employee:
            return Employee.objects.filter(id=employee.id).select_related(
                'department', 'role', 'role__department', 'golongan', 'branch', 'access_role', 'supervisor'
            )
            
        return Employee.objects.none()

    def get_serializer_class(self):
        if self.request.query_params.get('lite') == 'true':
            from .serializers import EmployeeLiteSerializer
            return EmployeeLiteSerializer
            
        # If it's a self-service update (not a manager), use the restricted profile serializer
        user = self.request.user
        if not user.is_staff:
            employee = Employee.objects.filter(email=user.email).select_related('access_role').first()
            if employee and not (employee.access_role and employee.access_role.permissions.get('manage_hr')):
                from .serializers import EmployeeProfileSerializer
                return EmployeeProfileSerializer
                
        return EmployeeSerializer

    def create(self, request, *args, **kwargs):
        """
        Custom create method to handle optional User account provisioning linking.
        Accepts: 'create_user' (bool) and 'is_admin' (bool) in request data.
        """
        create_user_flag = str(request.data.get('create_user', 'false')).lower() == 'true'
        is_admin_flag = str(request.data.get('is_admin', 'false')).lower() == 'true'

        # Quota Enforcement: Check total employee capacity (Base + Purchased Addons)
        if hasattr(request, 'tenant') and request.tenant:
            current_count = request.tenant.employee_count
            if current_count >= request.tenant.total_employee_capacity:
                return Response({
                    'error': f'Employee quota exceeded for your {request.tenant.plan_type} plan (Limit: {request.tenant.total_employee_capacity}).',
                    'code': 'QUOTA_EXCEEDED'
                }, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from users.models import User
        
        try:
            with transaction.atomic():
                # 1. Create the Employee Profile
                employee = serializer.save()

                # 2. Provision User Account if requested
                if create_user_flag:
                    user, created = User.objects.get_or_create(
                        email=employee.email,
                        defaults={
                            'first_name': employee.fullname,
                            'is_staff': is_admin_flag,
                        }
                    )
                    
                    if created:
                        # Set default password for newly provisioned users
                        user.set_password('harikerja2026!')
                        user.save()
                    elif is_admin_flag and not user.is_staff:
                        # If user exists but is being upgraded to admin in this context
                        user.is_staff = True
                        user.save()

                    # 3. Bind the User to the current Tenant 
                    if hasattr(request, 'tenant') and request.tenant:
                        user.tenants.add(request.tenant)

                headers = self.get_success_headers(serializer.data)
                return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class DashboardStatsAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_rbac_permission = 'manage_hr'

    def get(self, request):
        from django.db import connection
        
        # Default empty response structure
        empty_stats = {
            'total_employees': 0,
            'attendance_today': [],
            'pending_leaves': 0,
            'new_hires': 0,
            'department_distribution': [],
            'payroll_summary': {'total_net_pay': 0, 'total_overtime': 0},
            'trends': {'months': [], 'headcount': []},
            'attendance_percent': 0
        }

        if connection.schema_name == 'public':
            return Response(empty_stats)

        try:
            from attendance.models import Attendance
            today = timezone.localdate()

            # Full Organization Stats for HR/Managers
            total_employees = Employee.objects.count()
            dept_stats = Department.objects.annotate(
                employee_count=Count('employees'),
            ).values('name', 'employee_count')

            attendance_stats = Attendance.objects.filter(date=today).values('status').annotate(count=Count('id'))
            present_count = Attendance.objects.filter(date=today, status__in=['PRESENT', 'LATE']).count()
            total_emp = Employee.objects.count()
            attendance_percent = round((present_count / total_emp * 100) if total_emp > 0 else 0)
            
            from attendance.models import LeaveRequest
            pending_leaves = LeaveRequest.objects.filter(status='PENDING').count()
            
            thirty_days_ago = today - timezone.timedelta(days=30)
            new_hires = Employee.objects.filter(join_date__gte=thirty_days_ago).count()

            from payroll.models import Payslip
            payroll_totals = Payslip.objects.filter(
                period__month=today.month,
                period__year=today.year,
                payment_date__isnull=False
            ).aggregate(
                total_salary=Sum('net_pay'),
                total_overtime=Sum('overtime_pay')
            )

            attendance_percent = (present_count / total_employees * 100) if total_employees > 0 else 0
            
            return Response({
                'total_employees': total_employees,
                'attendance_percent': attendance_percent,
                'attendance_today': list(attendance_stats),
                'pending_leaves': pending_leaves,
                'new_hires': new_hires,
                'department_distribution': list(dept_stats),
                'payroll_summary': {
                    'total_net_pay': float(payroll_totals['total_salary'] or 0),
                    'total_overtime': float(payroll_totals['total_overtime'] or 0),
                },
                'trends': {
                    'months': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    'headcount': [total_employees] * 6,
                },
                'attendance_percent': round(attendance_percent, 1)
            })
        except Exception as e:
            logger.error(f"Error in DashboardStatsAPIView: {e}")
            return Response(empty_stats)
