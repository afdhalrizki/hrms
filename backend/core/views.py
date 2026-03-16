from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from django.db import transaction
from core.audit import AuditModelMixin
from core.permissions import HasRBACPermission
from .models import Department, Role, Golongan, Employee, AccessRole
from .serializers import (
    DepartmentSerializer, RoleSerializer, GolonganSerializer, 
    EmployeeSerializer, AccessRoleSerializer
)


class DepartmentViewSet(AuditModelMixin, viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_rbac_permission = 'manage_hr'


class RoleViewSet(AuditModelMixin, viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_rbac_permission = 'manage_hr'


class GolonganViewSet(AuditModelMixin, viewsets.ModelViewSet):
    queryset = Golongan.objects.all()
    serializer_class = GolonganSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_rbac_permission = 'manage_hr'


class AccessRoleViewSet(AuditModelMixin, viewsets.ModelViewSet):
    queryset = AccessRole.objects.all()
    serializer_class = AccessRoleSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_rbac_permission = 'manage_settings'


class EmployeeViewSet(AuditModelMixin, viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_rbac_permission = 'manage_hr'

    def get_queryset(self):
        queryset = Employee.objects.all()
        dept_id = self.request.query_params.get('department')
        if dept_id:
            queryset = queryset.filter(department_id=dept_id)
        return queryset

    def create(self, request, *args, **kwargs):
        """
        Custom create method to handle optional User account provisioning linking.
        Accepts: 'create_user' (bool) and 'is_admin' (bool) in request data.
        """
        create_user_flag = str(request.data.get('create_user', 'false')).lower() == 'true'
        is_admin_flag = str(request.data.get('is_admin', 'false')).lower() == 'true'

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from django.db import transaction
        from users.models import User
        
        try:
            with transaction.atomic():
                # 1. Create the Employee Profile
                employee = serializer.save()

                # 2. Provision User Account if requested
                if create_user_flag:
                    # We create/get the User in the shared schema automatically because 
                    # Users are meant to be shared across tenants, but bound by ManyToMany.
                    # Django Tenants forces the connection context.
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
                    # TenantMainMiddleware injects request.tenant
                    if hasattr(request, 'tenant') and request.tenant:
                        user.tenants.add(request.tenant)

                headers = self.get_success_headers(serializer.data)
                return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
