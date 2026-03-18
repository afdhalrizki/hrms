from rest_framework import serializers
from .models import RegistrationRequest, Tenant

class RegistrationRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegistrationRequest
        fields = ['id', 'company_name', 'subdomain_prefix', 'admin_email', 'status', 'created_at']
        read_only_fields = ['id', 'status', 'created_at']

class TenantSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ['id', 'name', 'schema_name', 'logo', 'address', 'phone', 'overtime_rate', 'payroll_overtime_divisor']
        read_only_fields = ['id', 'schema_name']
