from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'receive_email_notifications', 'is_staff', 'is_global_admin', 'global_role', 'role', 'permissions']
        read_only_fields = ['is_staff', 'role', 'permissions', 'global_role']

from django.contrib.auth.hashers import make_password
from tenants.models import Tenant

class GlobalAdminSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    tenants = serializers.PrimaryKeyRelatedField(queryset=Tenant.objects.all(), many=True, required=False)
    tenant_details = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'global_role', 'password', 'tenants', 'tenant_details']
        
    def get_tenant_details(self, obj):
        return [{"id": t.id, "name": t.name, "schema_name": t.schema_name} for t in obj.tenants.all()]
        
    def create(self, validated_data):
        password = validated_data.pop('password', 'password123')
        tenants_data = validated_data.pop('tenants', None)
        validated_data['password'] = make_password(password)
        validated_data['is_staff'] = True
        validated_data['is_global_admin'] = True
        instance = super().create(validated_data)
        if tenants_data is not None:
            instance.tenants.set(tenants_data)
        return instance
        
    def update(self, instance, validated_data):
        if 'password' in validated_data:
            validated_data['password'] = make_password(validated_data.pop('password'))
        tenants_data = validated_data.pop('tenants', None)
        instance = super().update(instance, validated_data)
        if tenants_data is not None:
            instance.tenants.set(tenants_data)
        return instance
