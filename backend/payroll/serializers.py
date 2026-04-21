from rest_framework import serializers
from .models import SalaryComponent, PayrollPeriod, Payslip, PayslipDetail, EmployeeSalaryComponent

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
    period_name = serializers.ReadOnlyField(source='period.__str__')
    status = serializers.SerializerMethodField()
    details = PayslipDetailSerializer(many=True, read_only=True)
    
    class Meta:
        model = Payslip
        fields = '__all__'

    def get_status(self, obj):
        if obj.payment_date:
            return 'PAID'
        return 'PROCESSED'

class EmployeeSalaryComponentSerializer(serializers.ModelSerializer):
    component_name = serializers.ReadOnlyField(source='component.name')
    component_type = serializers.ReadOnlyField(source='component.type')

    class Meta:
        model = EmployeeSalaryComponent
        fields = '__all__'
