from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import User
from .serializers import UserSerializer

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Users can see their own profile, staff can see all
        if self.request.user.is_staff:
            return User.objects.all()
        return User.objects.filter(id=self.request.user.id)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
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
