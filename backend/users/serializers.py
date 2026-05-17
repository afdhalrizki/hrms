from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'receive_email_notifications', 'is_staff', 'is_global_admin', 'global_role', 'role', 'permissions']
        read_only_fields = ['is_staff', 'role', 'permissions', 'global_role']

from django.contrib.auth.hashers import make_password

class GlobalAdminSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'global_role', 'password']
        
    def create(self, validated_data):
        password = validated_data.pop('password', 'password123')
        validated_data['password'] = make_password(password)
        validated_data['is_staff'] = True
        return super().create(validated_data)
        
    def update(self, instance, validated_data):
        if 'password' in validated_data:
            validated_data['password'] = make_password(validated_data.pop('password'))
        return super().update(instance, validated_data)
