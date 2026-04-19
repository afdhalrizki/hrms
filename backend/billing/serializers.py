from rest_framework import serializers

class CheckoutSerializer(serializers.Serializer):
    plan_type = serializers.ChoiceField(choices=['ESSENTIAL', 'PROFESSIONAL', 'PREMIUM'])
    months = serializers.IntegerField(min_value=1, max_value=12, default=1)
    
    # Add-on fields
    is_addon = serializers.BooleanField(default=False)
    addon_count = serializers.IntegerField(min_value=0, default=0)
    is_storage_addon = serializers.BooleanField(default=False)
    storage_gb = serializers.IntegerField(min_value=0, default=0)

    def validate(self, data):
        if data.get('is_addon') and data.get('addon_count', 0) <= 0:
            raise serializers.ValidationError("Employee addon_count must be greater than 0.")
        if data.get('is_storage_addon') and data.get('storage_gb', 0) <= 0:
            raise serializers.ValidationError("Storage storage_gb must be greater than 0.")
        return data

from .models import QuotaReductionRequest

class QuotaReductionRequestSerializer(serializers.ModelSerializer):
    tenant_name = serializers.ReadOnlyField(source='tenant.name')
    
    class Meta:
        model = QuotaReductionRequest
        fields = [
            'id', 'tenant', 'tenant_name', 'requested_gb_reduction', 
            'status', 'reason', 'admin_note', 
            'created_at', 'updated_at', 'reviewed_at'
        ]
        read_only_fields = ['id', 'reviewed_at']

    def validate_requested_gb_reduction(self, value):
        if value <= 0:
            raise serializers.ValidationError("Reduction amount must be greater than 0.")
        
        # Check against current extra_storage_mb
        tenant = self.context['request'].tenant
        current_extra_gb = tenant.extra_storage_mb // 1024
        
        if value > current_extra_gb:
            raise serializers.ValidationError(
                f"Cannot reduce by {value}GB. You only have {current_extra_gb}GB of extra storage."
            )
        
        return value
