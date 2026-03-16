from rest_framework import serializers
from .models import Department, Role, Golongan, Employee

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'

class RoleSerializer(serializers.ModelSerializer):
    department_name = serializers.ReadOnlyField(source='department.name')
    
    class Meta:
        model = Role
        fields = '__all__'

class GolonganSerializer(serializers.ModelSerializer):
    class Meta:
        model = Golongan
        fields = '__all__'

class EmployeeSerializer(serializers.ModelSerializer):
    department_name = serializers.ReadOnlyField(source='department.name')
    role_name = serializers.ReadOnlyField(source='role.name')
    golongan_name = serializers.ReadOnlyField(source='golongan.name')
    
    class Meta:
        model = Employee
        fields = '__all__'
