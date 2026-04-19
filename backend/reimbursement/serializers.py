from rest_framework import serializers
from .models import Reimbursement, ReimbursementCategory

class ReimbursementCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ReimbursementCategory
        fields = '__all__'

class ReimbursementSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='employee.fullname')
    category_name = serializers.ReadOnlyField(source='category.name')
    
    class Meta:
        model = Reimbursement
        fields = '__all__'
        read_only_fields = ['employee', 'status', 'current_stage', 'supervisor_status', 'finance_status', 'approved_amount']

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than zero.")
        return value

    def validate(self, data):
        category = data.get('category')
        amount = data.get('amount')
        
        if category and category.max_amount and amount > category.max_amount:
            raise serializers.ValidationError({
                'amount': f"Amount exceeds the maximum limit for this category ({category.max_amount})."
            })
        return data
