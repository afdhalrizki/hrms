from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import login, authenticate
from .models import User
from core.mixins import TenantIsolationMixin
from core.permissions import HasTenantRBACPermission, TenantAccessPermission
from users.permissions import HasGlobalPermission
from users.global_constants import GLOBAL_MANAGE_USERS
from rest_framework.exceptions import ValidationError
from .serializers import UserSerializer, GlobalAdminSerializer

class UserViewSet(TenantIsolationMixin, viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantRBACPermission, TenantAccessPermission]
    required_rbac_permission = 'tenant_manage_access_roles'
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
        is_manager = user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('tenant_manage_access_roles'))
        
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
        
        if email:
            email = email.lower().strip()
            
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

    @action(detail=False, methods=['post'], url_path='forgot-password')
    def forgot_password(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'email': ['This field is required.']}, status=status.HTTP_400_BAD_REQUEST)
        
        email = email.lower().strip()
        
        # Check if the user exists
        user = User.objects.filter(email__iexact=email).first()
        
        if user:
            # Multi-tenant isolation check: Ensure user belongs to the current tenant if we are in a tenant context
            current_tenant = getattr(request, 'tenant', None)
            is_allowed = True
            
            if (current_tenant and current_tenant.schema_name != 'public' and 
                not user.is_superuser and not getattr(user, 'is_global_admin', False)):
                if not user.tenants.filter(id=current_tenant.id).exists():
                    is_allowed = False
            
            if is_allowed:
                from django.contrib.auth.tokens import default_token_generator
                from django.utils.http import urlsafe_base64_encode
                from django.utils.encoding import force_bytes
                from notifications.tasks import send_notification_email_task
                
                token = default_token_generator.make_token(user)
                uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
                
                scheme = 'https' if request.is_secure() else 'http'
                host = request.get_host()
                
                # Check for standard frontend URL
                # If we are on port 8000 (backend), the frontend is usually on port 3000 in dev
                # Let's replace port 8000 with 3000 to direct the user back to the web frontend!
                if ':8000' in host:
                    host = host.replace(':8000', ':3000')
                
                reset_link = f"{scheme}://{host}/reset-password?uid={uidb64}&token={token}"
                
                subject = "Reset Kata Sandi HariKerja HRMS"
                message = f"Untuk mengatur ulang kata sandi Anda, silakan klik tautan berikut:\n{reset_link}\n\nTautan ini hanya berlaku sementara. Jika Anda tidak meminta pengaturan ulang ini, silakan abaikan email ini."
                
                send_notification_email_task.delay(user.email, subject, message)
        
        # Always return 200 OK for security to avoid email enumeration
        return Response(
            {'detail': 'Jika email Anda terdaftar di sistem kami, Anda akan segera menerima link untuk mereset kata sandi.'},
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['post'], url_path='reset-password')
    def reset_password(self, request):
        uidb64 = request.data.get('uid')
        token = request.data.get('token')
        password = request.data.get('password')
        
        errors = {}
        if not uidb64:
            errors['uid'] = ['This field is required.']
        if not token:
            errors['token'] = ['This field is required.']
        if not password:
            errors['password'] = ['This field is required.']
            
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)
            
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_decode
        from django.utils.encoding import force_str
        
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None
            
        if user is not None and default_token_generator.check_token(user, token):
            user.set_password(password)
            user.save()
            return Response({'detail': 'Kata sandi Anda telah berhasil diubah.'}, status=status.HTTP_200_OK)
            
        return Response({'detail': 'Token reset password tidak valid atau telah kedaluwarsa.'}, status=status.HTTP_400_BAD_REQUEST)


from rest_framework.decorators import api_view, permission_classes
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def health_check(request):
    return Response({"status": "healthy"}, status=status.HTTP_200_OK)

class GlobalAdminViewSet(viewsets.ModelViewSet):
    serializer_class = GlobalAdminSerializer
    permission_classes = [permissions.IsAuthenticated, HasGlobalPermission]
    required_global_permission = GLOBAL_MANAGE_USERS

    def get_queryset(self):
        return User.objects.exclude(global_role__isnull=True).exclude(global_role='')

    def perform_destroy(self, instance):
        if instance.id == self.request.user.id:
            raise ValidationError({"detail": "Cannot delete your own account."})
        if instance.global_role == 'SUPERADMIN':
            superadmin_count = User.objects.filter(global_role='SUPERADMIN').count()
            if superadmin_count <= 1:
                raise ValidationError({"detail": "Cannot delete the last SUPERADMIN."})
        # Django's ORM collector crashes when calling instance.delete() in the public schema
        # because it tries to query Tenant-only models to SET_NULL or CASCADE, which don't exist.
        # We use raw SQL to bypass the ORM collector. PostgreSQL handles DB-level M2M cascades.
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM users_user WHERE id = %s", [instance.id])

