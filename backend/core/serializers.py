from rest_framework import serializers
from .models import (
    Department, Role, Grade, Employee, AccessRole, 
    Branch, WorkflowConfig, WorkflowStage, WorkflowAction,
    APIKey, AuditLog, InternalTicket, InternalTicketMessage, InternalTicketAttachment
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
    actor_name = serializers.ReadOnlyField(source='actor.email')

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

class GradeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Grade
        fields = '__all__'

class AccessRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccessRole
        fields = '__all__'

class EmployeeSerializer(serializers.ModelSerializer):
    department_name = serializers.ReadOnlyField(source='department.name')
    role_name = serializers.ReadOnlyField(source='role.name')
    grade_name = serializers.ReadOnlyField(source='grade.name')
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


class EmployeeProfileSerializer(serializers.ModelSerializer):
    """Specialized serializer for self-service profile updates (Phase 70)."""
    department_name = serializers.ReadOnlyField(source='department.name')
    role_name = serializers.ReadOnlyField(source='role.name')
    grade_name = serializers.ReadOnlyField(source='grade.name')
    supervisor_name = serializers.ReadOnlyField(source='supervisor.fullname')
    
    class Meta:
        model = Employee
        fields = [
            'id', 'fullname', 'nik', 'email', 'phone', 'address',
            'department_name', 'role_name', 'grade_name', 'supervisor_name',
            'ktp_number', 'npwp_number', 'ptkp_status', 'ktp_image', 'npwp_image',
            'face_reference', 'join_date', 'status'
        ]
        read_only_fields = [
            'id', 'fullname', 'nik', 'email', 'department_name', 
            'role_name', 'grade_name', 'supervisor_name', 
            'join_date', 'status'
        ]
        extra_kwargs = {
            'ktp_number': {'required': False},
            'npwp_number': {'required': False},
        }


class InternalTicketAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = InternalTicketAttachment
        fields = ['id', 'file', 'uploaded_at']


class InternalTicketMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.ReadOnlyField(source='sender.fullname')

    class Meta:
        model = InternalTicketMessage
        fields = ['id', 'sender', 'sender_name', 'message', 'is_internal', 'created_at']
        read_only_fields = ['id', 'sender', 'created_at']


class InternalTicketSerializer(serializers.ModelSerializer):
    creator_name = serializers.ReadOnlyField(source='creator.fullname')
    assigned_to_name = serializers.ReadOnlyField(source='assigned_to.fullname')
    messages_count = serializers.SerializerMethodField()

    class Meta:
        model = InternalTicket
        fields = ['id', 'creator', 'creator_name', 'title', 'description', 'category', 'priority', 'status', 'assigned_to', 'assigned_to_name', 'messages_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'creator', 'status', 'created_at', 'updated_at']

    def get_messages_count(self, obj):
        return obj.messages.count()


class InternalTicketDetailSerializer(InternalTicketSerializer):
    messages = serializers.SerializerMethodField()
    attachments = InternalTicketAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = InternalTicket
        fields = ['id', 'creator', 'creator_name', 'title', 'description', 'category', 'priority', 'status', 'assigned_to', 'assigned_to_name', 'messages', 'attachments', 'created_at', 'updated_at']
        read_only_fields = ['id', 'creator', 'status', 'created_at', 'updated_at']

    def get_messages(self, obj):
        request = self.context.get('request')
        if not request:
            return []
        user = request.user
        is_hr = False
        if user.is_staff or user.is_superuser:
            is_hr = True
        elif user.role in ['ADMIN', 'MANAGER']:
            is_hr = True
        
        queryset = obj.messages.all().order_by('created_at')
        if not is_hr:
            queryset = queryset.filter(is_internal=False)
            
        return InternalTicketMessageSerializer(queryset, many=True).data

