from rest_framework import serializers
from .models import (
    Department, Role, Golongan, Employee, AccessRole, 
    Branch, WorkflowConfig, WorkflowStage, WorkflowAction
)

class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = '__all__'

class WorkflowStageSerializer(serializers.ModelSerializer):
    approver_role_name = serializers.ReadOnlyField(source='approver_role.name')
    approver_employee_name = serializers.ReadOnlyField(source='approver_employee.fullname')

    class Meta:
        model = WorkflowStage
        fields = '__all__'

class WorkflowConfigSerializer(serializers.ModelSerializer):
    stages = WorkflowStageSerializer(many=True, read_only=True)
    
    class Meta:
        model = WorkflowConfig
        fields = '__all__'

class WorkflowActionSerializer(serializers.ModelSerializer):
    actor_name = serializers.ReadOnlyField(source='actor.fullname')
    stage_name = serializers.ReadOnlyField(source='stage.name')

    class Meta:
        model = WorkflowAction
        fields = '__all__'

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

class AccessRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccessRole
        fields = '__all__'

class EmployeeSerializer(serializers.ModelSerializer):
    department_name = serializers.ReadOnlyField(source='department.name')
    role_name = serializers.ReadOnlyField(source='role.name')
    golongan_name = serializers.ReadOnlyField(source='golongan.name')
    access_role_name = serializers.ReadOnlyField(source='access_role.name')
    supervisor_name = serializers.ReadOnlyField(source='supervisor.fullname')
    
    class Meta:
        model = Employee
        fields = '__all__'


class EmployeeLiteSerializer(serializers.ModelSerializer):
    """Lightweight serializer for mobile employee list."""
    department_name = serializers.ReadOnlyField(source='department.name')
    role_name = serializers.ReadOnlyField(source='role.name')
    
    class Meta:
        model = Employee
        fields = ['id', 'fullname', 'nik', 'department_name', 'role_name', 'photo', 'join_date']
