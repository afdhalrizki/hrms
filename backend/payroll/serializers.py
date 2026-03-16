from rest_framework import serializers
from .models import SalaryComponent, PayrollPeriod, Payslip, PayslipDetail

class SalaryComponentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalaryComponent
        fields = '__all__'

class PayrollPeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollPeriod
        fields = '__all__'

class PayslipDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayslipDetail
        fields = '__all__'

class PayslipSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='employee.fullname')
    details = PayslipDetailSerializer(many=True, read_only=True)
    
    class Meta:
        model = Payslip
        fields = '__all__'
