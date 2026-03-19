from rest_framework import serializers
from .models import (
    Department, Role, Golongan, Employee, AccessRole, 
    Branch, WorkflowConfig, WorkflowStage, WorkflowAction,
    APIKey, AuditLog
)

class APIKeySerializer(serializers.ModelSerializer):
    class Meta:
        model = APIKey
        fields = ['id', 'label', 'key_prefix', 'expires_at', 'last_used_at', 'is_active', 'created_at']
        read_only_fields = ['key_prefix', 'last_used_at', 'created_at']

    def create(self, validated_data):
        import secrets
        import hashlib
        
        # Generate secret (only shown once)
        secret = secrets.token_urlsafe(32)
        prefix = secrets.token_hex(4) # 8 chars
        
        validated_data['key_prefix'] = prefix
        validated_data['key_hash'] = hashlib.sha256(secret.encode()).hexdigest()
        
        instance = super().create(validated_data)
        
        # Attach raw secret for the response (not saved to DB)
        instance.raw_key = f"{prefix}.{secret}"
        return instance

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if hasattr(instance, 'raw_key'):
            ret['secret_key'] = instance.raw_key
        return ret


class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.ReadOnlyField(source='actor.fullname')

    class Meta:
        model = AuditLog
        fields = '__all__'

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
        fields = ['id', 'fullname', 'nik', 'department_name', 'role_name', 'join_date']
