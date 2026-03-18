from rest_framework import serializers
from .models import Attendance, LeaveRequest, Overtime, Shift, Schedule, LeaveBalance

class AttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='employee.fullname')
    
    class Meta:
        model = Attendance
        fields = '__all__'

class LeaveBalanceSerializer(serializers.ModelSerializer):
    remaining_days = serializers.ReadOnlyField()

    class Meta:
        model = LeaveBalance
        fields = '__all__'

class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='employee.fullname')
    remaining_balance = serializers.SerializerMethodField()

    class Meta:
        model = LeaveRequest
        fields = ['id', 'employee', 'employee_name', 'start_date', 'end_date', 'leave_type', 'reason', 'status', 'supervisor_status', 'hr_status', 'attachment', 'remaining_balance']
        read_only_fields = ['status', 'supervisor_status', 'hr_status']

    def get_remaining_balance(self, obj):
        balance = LeaveBalance.objects.filter(employee=obj.employee, year=obj.start_date.year).first()
        return balance.remaining_days if balance else 12.0

class OvertimeSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='employee.fullname')
    
    class Meta:
        model = Overtime
        fields = ['id', 'employee', 'employee_name', 'date', 'hours', 'reason', 'status', 'supervisor_status', 'hr_status']
        read_only_fields = ['status', 'supervisor_status', 'hr_status']

class ShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shift
        fields = '__all__'

class ScheduleSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='employee.fullname')
    shift_name = serializers.ReadOnlyField(source='shift.name')
    
    class Meta:
        model = Schedule
        fields = '__all__'
