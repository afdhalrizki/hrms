from django.contrib import admin
from .models import Attendance, LeaveRequest, Overtime, Shift, Schedule

@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('employee', 'date', 'check_in', 'check_out', 'status')
    search_fields = ('employee__fullname', 'date')
    list_filter = ('status', 'date')

@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = ('employee', 'leave_type', 'start_date', 'end_date', 'status')
    search_fields = ('employee__fullname',)
    list_filter = ('leave_type', 'status')

@admin.register(Overtime)
class OvertimeAdmin(admin.ModelAdmin):
    list_display = ('employee', 'date', 'hours', 'status')
    search_fields = ('employee__fullname', 'date')
    list_filter = ('status',)
@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = ('name', 'start_time', 'end_time', 'break_duration_mins', 'is_flexible')
    search_fields = ('name',)

@admin.register(Schedule)
class ScheduleAdmin(admin.ModelAdmin):
    list_display = ('employee', 'shift', 'date')
    list_filter = ('shift', 'date')
    search_fields = ('employee__fullname',)
