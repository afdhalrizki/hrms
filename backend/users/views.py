from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import login, authenticate
from .models import User
from .serializers import UserSerializer

from core.permissions import HasRBACPermission, TenantAccessPermission

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, TenantAccessPermission]

    def get_queryset(self):
        # Users can see their own profile, staff can see all
        if self.request.user.is_staff:
            return User.objects.all()
        return User.objects.filter(id=self.request.user.id)

    @action(detail=False, methods=['get'])
    def me(self, request):
        """
        Returns the current user's profile and linked employee data for the current tenant.
        """
        user = request.user
        data = UserSerializer(user).data
        
        # Link employee data if available in the current tenant schema
        from core.models import Employee
        
        employee = Employee.objects.filter(email=user.email).first()
        if employee:
            data['employee_id'] = employee.id
            data['employee_nik'] = employee.nik
            data['fullname'] = employee.fullname
            data['role_name'] = str(employee.role.name) if employee.role else None
            data['department_name'] = str(employee.department.name) if employee.department else None
        else:
            data['employee_id'] = None
            data['employee_nik'] = None
            
        return Response(data)

class LoginAPIView(viewsets.GenericViewSet):
    permission_classes = [permissions.AllowAny]
    serializer_class = UserSerializer

    @action(detail=False, methods=['post'])
    def login(self, request):
        from rest_framework_simplejwt.tokens import RefreshToken
        email = request.data.get('email')
        password = request.data.get('password')
        
        user = authenticate(request, email=email, password=password)
        if user:
            refresh = RefreshToken.for_user(user)
            data = UserSerializer(user).data
            data['access'] = str(refresh.access_token)
            data['refresh'] = str(refresh)
            return Response(data)
        
        return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
