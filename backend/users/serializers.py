from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'receive_email_notifications', 'is_staff', 'is_global_admin', 'role', 'permissions']
        read_only_fields = ['is_staff', 'role', 'permissions']
