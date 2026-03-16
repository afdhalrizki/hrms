from rest_framework import serializers
from .models import Attendance, LeaveRequest, Overtime, Shift, Schedule

class AttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='employee.fullname')
    
    class Meta:
        model = Attendance
        fields = '__all__'

class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='employee.fullname')
    
    class Meta:
        model = LeaveRequest
        fields = '__all__'

class OvertimeSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='employee.fullname')
    
    class Meta:
        model = Overtime
        fields = '__all__'

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
