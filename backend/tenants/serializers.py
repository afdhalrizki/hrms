from rest_framework import serializers
from .models import RegistrationRequest, Tenant, PlatformTicket, PlatformTicketMessage

class RegistrationRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegistrationRequest
        fields = ['id', 'company_name', 'subdomain_prefix', 'admin_email', 'status', 'created_at']
        read_only_fields = ['id', 'status', 'created_at']

    def validate_subdomain_prefix(self, value):
        # Check for collisions with existing tenants
        schema_name = value.replace('-', '_').lower()
        if Tenant.objects.filter(schema_name=schema_name).exists():
            raise serializers.ValidationError("This subdomain is already in use by another company.")
        return value

class TenantSettingsSerializer(serializers.ModelSerializer):
    is_grace_period = serializers.BooleanField(read_only=True)
    is_subscription_active = serializers.BooleanField(read_only=True)
    total_employee_capacity = serializers.IntegerField(read_only=True)
    total_storage_capacity_mb = serializers.IntegerField(read_only=True)
    employee_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Tenant
        fields = [
            'id', 'name', 'schema_name', 'logo', 'theme_primary_color', 'theme_secondary_color', 
            'address', 'phone', 'enabled_modules',
            'overtime_rate', 'payroll_overtime_divisor', 'jkk_rate',
            'late_deduction_rate', 'absence_deduction_rate',
            'leave_approval_level', 'overtime_approval_level', 'reimbursement_approval_level', 
            'is_biometric_enabled', 'is_fingerprint_enabled', 'attendance_platform_policy',
            'max_admins',
            'subscription_status', 'expiry_date', 'plan_type', 
            'is_grace_period', 'is_subscription_active',
            'max_employees', 'extra_employees', 'total_employee_capacity',
            'storage_limit_mb', 'extra_storage_mb', 'total_storage_capacity_mb',
            'storage_used_bytes', 'employee_count'
        ]
        read_only_fields = [
            'id', 'schema_name', 'subscription_status', 'expiry_date', 'plan_type', 
            'is_grace_period', 'is_subscription_active', 'total_employee_capacity', 
            'total_storage_capacity_mb', 'employee_count', 'storage_used_bytes'
        ]


class PlatformTicketMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.ReadOnlyField(source='sender.email')

    class Meta:
        model = PlatformTicketMessage
        fields = ['id', 'sender', 'sender_name', 'message', 'created_at']
        read_only_fields = ['id', 'sender', 'created_at']


class PlatformTicketSerializer(serializers.ModelSerializer):
    tenant_name = serializers.ReadOnlyField(source='tenant.name')
    assigned_agent_name = serializers.ReadOnlyField(source='assigned_agent.email')
    messages_count = serializers.SerializerMethodField()

    class Meta:
        model = PlatformTicket
        fields = [
            'id', 'tenant', 'tenant_name', 'creator_email', 'title', 'description', 
            'category', 'priority', 'status', 'assigned_agent', 'assigned_agent_name', 
            'messages_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'tenant', 'creator_email', 'status', 'assigned_agent', 'created_at', 'updated_at']

    def get_messages_count(self, obj):
        return obj.messages.count()


class PlatformTicketDetailSerializer(PlatformTicketSerializer):
    messages = PlatformTicketMessageSerializer(many=True, read_only=True)

    class Meta:
        model = PlatformTicket
        fields = [
            'id', 'tenant', 'tenant_name', 'creator_email', 'title', 'description', 
            'category', 'priority', 'status', 'assigned_agent', 'assigned_agent_name', 
            'messages', 'messages_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'tenant', 'creator_email', 'status', 'assigned_agent', 'created_at', 'updated_at']


