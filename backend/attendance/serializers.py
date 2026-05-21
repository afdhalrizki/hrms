from rest_framework import serializers
from .models import Attendance, LeaveRequest, Overtime, Shift, Schedule, LeaveBalance, AttendanceCorrectionRequest, FingerprintDevice, DeviceAttendanceLog

class AttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='employee.fullname')
    is_late = serializers.SerializerMethodField()
    
    class Meta:
        model = Attendance
        fields = '__all__'

    def get_is_late(self, obj):
        return obj.status == 'LATE'

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
        read_only_fields = ['status', 'supervisor_status', 'hr_status', 'employee']

    def get_remaining_balance(self, obj):
        balance = LeaveBalance.objects.filter(employee=obj.employee, year=obj.start_date.year).first()
        return balance.remaining_days if balance else 12.0

    def validate(self, data):
        if data.get('start_date') and data.get('end_date'):
            if data['start_date'] > data['end_date']:
                raise serializers.ValidationError("End date cannot be before start date.")
        return data

class OvertimeSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='employee.fullname')
    
    class Meta:
        model = Overtime
        fields = ['id', 'employee', 'employee_name', 'date', 'hours', 'reason', 'status', 'supervisor_status', 'hr_status']
        read_only_fields = ['status', 'supervisor_status', 'hr_status', 'employee']

    def validate_hours(self, value):
        if value <= 0:
            raise serializers.ValidationError("Hours must be greater than zero.")
        return value

class ShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shift
        fields = '__all__'

class ScheduleSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='employee.fullname')
    shift_name = serializers.ReadOnlyField(source='shift.name')
    shift_detail = ShiftSerializer(source='shift', read_only=True)
    
    class Meta:
        model = Schedule
        fields = '__all__'


class AttendanceCorrectionRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='employee.fullname')
    attendance_date = serializers.ReadOnlyField(source='attendance.date')
    current_check_in = serializers.ReadOnlyField(source='attendance.check_in')
    current_check_out = serializers.ReadOnlyField(source='attendance.check_out')

    class Meta:
        model = AttendanceCorrectionRequest
        fields = [
            'id', 'attendance', 'attendance_date', 'employee', 'employee_name',
            'current_check_in', 'current_check_out', 
            'requested_check_in', 'requested_check_out', 
            'reason', 'status', 'current_stage'
        ]
        read_only_fields = ['status', 'current_stage', 'employee']


class FingerprintDeviceSerializer(serializers.ModelSerializer):
    branch_name = serializers.ReadOnlyField(source='branch.name')

    class Meta:
        model = FingerprintDevice
        fields = '__all__'


class DeviceAttendanceLogSerializer(serializers.ModelSerializer):
    device_name = serializers.ReadOnlyField(source='device.name')

    class Meta:
        model = DeviceAttendanceLog
        fields = '__all__'
