from rest_framework import serializers
from .models import RegistrationRequest, Tenant

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

    class Meta:
        model = Tenant
        fields = [
            'id', 'name', 'schema_name', 'logo', 'theme_primary_color', 'theme_secondary_color', 
            'address', 'phone', 'enabled_modules',
            'overtime_rate', 'payroll_overtime_divisor', 'leave_approval_level', 
            'overtime_approval_level', 'max_admins',
            'subscription_status', 'expiry_date', 'plan_type', 
            'is_grace_period', 'is_subscription_active'
        ]
        read_only_fields = ['id', 'schema_name', 'subscription_status', 'expiry_date', 'plan_type', 'is_grace_period', 'is_subscription_active']
