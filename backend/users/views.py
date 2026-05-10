from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import login, authenticate
from .models import User
from .serializers import UserSerializer
from core.permissions import HasRBACPermission, TenantAccessPermission
from core.mixins import TenantIsolationMixin

class UserViewSet(TenantIsolationMixin, viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission, TenantAccessPermission]
    required_rbac_permission = 'manage_access_roles'
    allow_self_service = True
    allow_self_service_list = True

    def get_queryset(self):
        # Users can see their own profile, managers can see all
        user = self.request.user
        
        # 1. Self-service
        if self.action in ['retrieve', 'me']:
            return User.objects.filter(id=user.id)
            
        # 2. Management Access
        from core.models import Employee
        employee = Employee.objects.filter(email=user.email).select_related('access_role').first()
        is_manager = user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('manage_access_roles'))
        
        if is_manager:
            return User.objects.all()
            
        return User.objects.filter(id=user.id)

    @action(detail=False, methods=['get'])
    def me(self, request):
        """
        Returns the current user's profile and linked employee data for the current tenant.
        """
        user = request.user
        from core.models import Employee
        
        # Link employee data ONLY if we are in a tenant schema.
        # core.Employee is in TENANT_APPS, so it doesn't exist in 'public'.
        data = UserSerializer(user).data
        current_tenant = getattr(request, 'tenant', None)
        is_public = not current_tenant or current_tenant.schema_name == 'public'
        
        if not is_public:
            employee = Employee.objects.filter(email=user.email).select_related('role', 'department', 'role__department', 'grade', 'access_role', 'supervisor').first()
            if employee:
                data['employee_id'] = employee.id
                data['employee_nik'] = employee.nik
                data['fullname'] = employee.fullname
                data['role_name'] = str(employee.role.name) if employee.role else None
                data['department_name'] = str(employee.department.name) if employee.department else None
            else:
                data['employee_id'] = None
                data['employee_nik'] = None
        else:
            data['employee_id'] = None
            data['employee_nik'] = None
            data['fullname'] = f"System Admin ({user.email})"
        
        return Response(data)

class LoginAPIView(viewsets.GenericViewSet):
    permission_classes = [permissions.AllowAny]
    serializer_class = UserSerializer

    @action(detail=False, methods=['post'])
    def login(self, request):
        from rest_framework_simplejwt.tokens import RefreshToken
        email = request.data.get('email')
        password = request.data.get('password')
        
        user = authenticate(request, username=email, password=password)
        if user:
            # Multi-tenant isolation check: Ensure user belongs to the current tenant
            current_tenant = getattr(request, 'tenant', None)
            if (current_tenant and current_tenant.schema_name != 'public' and 
                not user.is_superuser and not getattr(user, 'is_global_admin', False)):
                
                if not user.tenants.filter(id=current_tenant.id).exists():
                    return Response(
                        {'detail': f'Akses ditolak. Anda tidak terdaftar di tenant {current_tenant.name}.'}, 
                        status=status.HTTP_401_UNAUTHORIZED
                    )

            login(request, user)  # Set session cookie for web clients
            
            from rest_framework_simplejwt.tokens import RefreshToken
            refresh = RefreshToken.for_user(user)
            
            # Multi-tenant isolation: Bind token to the current tenant
            if current_tenant:
                refresh['tenant_id'] = current_tenant.id
                
            data = UserSerializer(user).data
            data['access'] = str(refresh.access_token)
            data['refresh'] = str(refresh)
            return Response(data)
        return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

from rest_framework.decorators import api_view, permission_classes
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def health_check(request):
    return Response({"status": "healthy"}, status=status.HTTP_200_OK)
