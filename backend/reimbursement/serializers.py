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
        read_only_fields = ['employee', 'status', 'supervisor_status', 'finance_status', 'approved_amount']
