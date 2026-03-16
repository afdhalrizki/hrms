from rest_framework import viewsets, permissions
from core.audit import AuditModelMixin
from .models import Department, Role, Golongan, Employee
from .serializers import DepartmentSerializer, RoleSerializer, GolonganSerializer, EmployeeSerializer


class DepartmentViewSet(AuditModelMixin, viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated]


class RoleViewSet(AuditModelMixin, viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated]


class GolonganViewSet(AuditModelMixin, viewsets.ModelViewSet):
    queryset = Golongan.objects.all()
    serializer_class = GolonganSerializer
    permission_classes = [permissions.IsAuthenticated]


class EmployeeViewSet(AuditModelMixin, viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Employee.objects.all()
        dept_id = self.request.query_params.get('department')
        if dept_id:
            queryset = queryset.filter(department_id=dept_id)
        return queryset
