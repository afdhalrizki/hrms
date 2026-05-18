import logging
from rest_framework import viewsets, permissions, status, views
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Count, Sum
from datetime import date, timedelta
from django.utils import timezone
from core.audit import AuditModelMixin
from core.permissions import HasTenantRBACPermission
from .models import (
    Department, Role, Grade, Employee, AccessRole,
    Branch, WorkflowConfig, WorkflowStage, WorkflowAction,
    APIKey, AuditLog
)
from .serializers import (
    DepartmentSerializer, RoleSerializer, GradeSerializer, 
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
    permission_classes = [permissions.IsAuthenticated, HasTenantRBACPermission]
    required_rbac_permission = 'tenant_manage_settings'

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return APIKey.objects.all()
            
        employee = getattr(user, 'employee', None)
        if not employee:
            from .models import Employee
            employee = Employee.objects.filter(email=user.email).first()
            
        if employee and employee.access_role and employee.access_role.permissions.get('tenant_manage_settings'):
            return APIKey.objects.all()
        return APIKey.objects.none()


class AuditLogViewSet(TenantIsolationMixin, viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantRBACPermission]
    required_rbac_permission = 'tenant_view_audit_logs'

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return AuditLog.objects.all()
            
        employee = getattr(user, 'employee', None)
        if not employee:
            from .models import Employee
            employee = Employee.objects.filter(email=user.email).first()
            
        if employee and employee.access_role and employee.access_role.permissions.get('tenant_view_audit_logs'):
            return AuditLog.objects.all()
            
        # Raise 403 instead of returning empty list to be strict with audit logs
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied("You do not have permission to view audit logs.")


class BranchViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantRBACPermission]
    required_rbac_permission = 'tenant_manage_hr'


class WorkflowConfigViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
    queryset = WorkflowConfig.objects.all()
    serializer_class = WorkflowConfigSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantRBACPermission]
    required_rbac_permission = 'tenant_manage_settings'


class WorkflowStageViewSet(AuditModelMixin, viewsets.ModelViewSet):
    queryset = WorkflowStage.objects.all()
    serializer_class = WorkflowStageSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantRBACPermission]
    required_rbac_permission = 'tenant_manage_settings'


class WorkflowActionViewSet(AuditModelMixin, viewsets.ReadOnlyModelViewSet):
    queryset = WorkflowAction.objects.all()
    serializer_class = WorkflowActionSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantRBACPermission]
    required_rbac_permission = 'tenant_manage_attendance' # Actors need this to see history


class DepartmentViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantRBACPermission]
    required_rbac_permission = 'tenant_manage_hr'


class RoleViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantRBACPermission]
    required_rbac_permission = 'tenant_manage_hr'


class GradeViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
    queryset = Grade.objects.all()
    serializer_class = GradeSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantRBACPermission]
    required_rbac_permission = 'tenant_manage_hr'


class AccessRoleViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
    queryset = AccessRole.objects.all()
    serializer_class = AccessRoleSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantRBACPermission]
    required_rbac_permission = 'tenant_manage_access_roles'


class EmployeeViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
    queryset = Employee.objects.none()
    serializer_class = EmployeeSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantRBACPermission]
    required_rbac_permission = 'tenant_manage_hr'
    allow_self_service = True

    def get_queryset(self):
        from django.db import connection
        
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()

        # Managers/HR see everyone
        if user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('tenant_manage_hr')):
            queryset = Employee.objects.all().select_related(
                'department', 'role', 'role__department', 'grade', 'branch', 'access_role', 'supervisor'
            )
            dept_id = self.request.query_params.get('department')
            if dept_id:
                queryset = queryset.filter(department_id=dept_id)

            show_terminated = self.request.query_params.get('show_terminated') == 'true'
            if not show_terminated:
                queryset = queryset.exclude(status__in=['TERMINATED', 'RESIGNED'])

            return queryset
            
        # Employees can only see themselves
        if employee:
            return Employee.objects.filter(id=employee.id).select_related(
                'department', 'role', 'role__department', 'grade', 'branch', 'access_role', 'supervisor'
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
            if employee and not (employee.access_role and employee.access_role.permissions.get('tenant_manage_hr')):
                from .serializers import EmployeeProfileSerializer
                return EmployeeProfileSerializer
                
        return EmployeeSerializer

    def create(self, request, *args, **kwargs):
        """
        Custom create method to handle optional User account provisioning linking.
        Accepts: 'create_user' (bool) and 'is_admin' (bool) in request data.
        """
        print(f"DEBUG: EmployeeViewSet.create called for {request.path}")
        create_user_flag = str(request.data.get('create_user', 'false')).lower() == 'true'
        is_admin_flag = str(request.data.get('is_admin', 'false')).lower() == 'true'

        # Quota Enforcement: Check total employee capacity (Base + Purchased Addons)
        if hasattr(request, 'tenant') and request.tenant and request.tenant.schema_name != 'public':
            from tenants.models import Tenant
            try:
                # Refresh count from DB to avoid stale data issues
                t = Tenant.objects.get(schema_name=request.tenant.schema_name)
                current_count = t.employee_count
                capacity = t.total_employee_capacity
                is_terminated = str(request.data.get('status', '')).upper() == 'TERMINATED'
                if not is_terminated and current_count >= capacity:
                    return Response({
                        'error': f'Employee quota exceeded for your {t.plan_type} plan (Limit: {capacity}).',
                        'code': 'QUOTA_EXCEEDED'
                    }, status=status.HTTP_403_FORBIDDEN)
            except Tenant.DoesNotExist:
                pass

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
                        user.set_password('HariKerja2026!')
                        user.save()
                    elif is_admin_flag and not user.is_staff:
                        # If user exists but is being upgraded to admin in this context
                        user.is_staff = True
                        user.save()

                    # 3. Bind the User to the current Tenant 
                    if hasattr(request, 'tenant') and request.tenant:
                        user.tenants.add(request.tenant)

                    # 4. Trigger Onboarding Notification (NEW)
                    from notifications.services import NotificationService
                    service = NotificationService()
                    
                    # Determine domain name for the login link
                    domain_name = "app.HariKerja.com"
                    if hasattr(request, 'tenant') and request.tenant:
                        domain = request.tenant.domains.first()
                        if domain:
                            domain_name = domain.domain
                    
                    service.notify_employee_onboarding(employee, domain_name)

                headers = self.get_success_headers(serializer.data)
                return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

        except Exception as e:
            # Catch quota or validation errors
            err_msg = str(e)
            if err_msg.startswith("['") and err_msg.endswith("']"):
                err_msg = err_msg[2:-2]
            err_msg_lower = err_msg.lower()
            if 'quota' in err_msg_lower and 'exceeded' in err_msg_lower:
                return Response({
                    'error': err_msg,
                    'code': 'QUOTA_EXCEEDED'
                }, status=status.HTTP_403_FORBIDDEN)
            return Response({'error': err_msg}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        """
        Custom update method to catch Django ValidationError from pre_save signals
        and return a clean HTTP 400 response.
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        try:
            with transaction.atomic():
                self.perform_update(serializer)
            return Response(serializer.data)
        except Exception as e:
            err_msg = str(e)
            if err_msg.startswith("['") and err_msg.endswith("']"):
                err_msg = err_msg[2:-2]
            err_msg_lower = err_msg.lower()
            if 'quota' in err_msg_lower and 'exceeded' in err_msg_lower:
                return Response({
                    'error': err_msg,
                    'code': 'QUOTA_EXCEEDED'
                }, status=status.HTTP_403_FORBIDDEN)
            return Response({'error': err_msg}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def terminate(self, request, pk=None):
        """
        Endpoint khusus untuk menonaktifkan/menghentikan karyawan (TERMINATED).
        Melewati validasi serializer choices untuk menulis langsung ke model status.
        """
        employee = self.get_object()
        
        # Set status secara langsung (bypassing serializer choices)
        employee.status = 'TERMINATED'
        employee.save()
        
        return Response(
            {'status': f'Karyawan {employee.fullname} telah dinonaktifkan (TERMINATED).'},
            status=status.HTTP_200_OK
        )

class DashboardStatsAPIView(TenantIsolationMixin, views.APIView):
    permission_classes = [permissions.IsAuthenticated, HasTenantRBACPermission]
    required_rbac_permission = 'tenant_manage_hr'

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
            
            # Use status__in to count PRESENT and LATE
            present_count = Attendance.objects.filter(date=today, status__in=['PRESENT', 'LATE']).count()
            
            # If present_count is 0, let's check if there are ANY records for today (maybe they are all ABSENT/LEAVE)
            # This is helpful for debugging why it shows 0%
            total_attendance_today = Attendance.objects.filter(date=today).count()
            
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

            # Recalculate percent cleanly
            attendance_percent = (present_count / total_employees * 100) if total_employees > 0 else 0
            
            return Response({
                'total_employees': total_employees,
                'attendance_percent': round(attendance_percent, 1),
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
                }
            })
        except Exception as e:
            logger.error(f"Error in DashboardStatsAPIView: {e}")
            return Response(empty_stats)
