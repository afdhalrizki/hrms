from rest_framework import serializers
from .models import RegistrationRequest

class RegistrationRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegistrationRequest
        fields = ['id', 'company_name', 'subdomain_prefix', 'admin_email', 'status', 'created_at']
        read_only_fields = ['id', 'status', 'created_at']
