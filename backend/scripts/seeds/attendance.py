from django_tenants.utils import schema_context
from django.utils import timezone
from datetime import timedelta
from attendance.models import Attendance, LeaveBalance, LeaveRequest, Shift, Schedule, Overtime, AttendanceCorrectionRequest

def seed_attendance_data(tenant, employee):
    """Seed attendance logs, schedules, and leave balances for an employee."""
    schema_name = tenant.schema_name
    with schema_context(schema_name):
        # Force search_path for reliability in parallel/complex seeding
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute(f'SET search_path TO "{schema_name}", public')
            
        # 1. Shifts & Schedules
        shift_pagi, _ = Shift.objects.get_or_create(
            name='Shift Pagi',
            defaults={'start_time': '08:00:00', 'end_time': '17:00:00', 'work_days': [0, 1, 2, 3, 4]}
        )
        Schedule.objects.get_or_create(employee=employee, date=timezone.localdate(), defaults={'shift': shift_pagi})

        # 2. Attendance History (Last 30 Days)
        today = timezone.localdate()
        for i in range(30):
            d = today - timedelta(days=i)
            if d.weekday() < 5 or i == 0: # Monday-Friday OR Today (ensure test stability on weekends)
                status = 'PRESENT'
                check_in = '08:00:00'
                if i % 7 == 0: # Some late
                    status = 'LATE'
                    check_in = '09:15:00'
                
                if i == 0:
                    # For today, we ALWAYS want a fresh state (checked in but not out) 
                    # to ensure the E2E "Check Out" test is deterministic.
                    Attendance.objects.update_or_create(
                        employee=employee, date=d,
                        defaults={
                            'check_in': check_in, 
                            'check_out': None,
                            'status': status,
                            'liveness_verified': True,
                            'verification_method': 'LIVENESS'
                        }
                    )
                else:
                    Attendance.objects.get_or_create(
                        employee=employee, date=d,
                        defaults={
                            'check_in': check_in, 
                            'check_out': '17:00:00',
                            'status': status,
                            'liveness_verified': True,
                            'verification_method': 'LIVENESS'
                        }
                    )

        # 3. Overtime & Corrections
        Overtime.objects.get_or_create(
            employee=employee, date=today - timedelta(days=2),
            defaults={'hours': 2.5, 'status': 'APPROVED', 'reason': 'Critical bug fix'}
        )
        
        last_attendance = Attendance.objects.filter(employee=employee).last()
        if last_attendance:
            AttendanceCorrectionRequest.objects.get_or_create(
                employee=employee, attendance=last_attendance,
                defaults={'requested_check_in': '08:00:00', 'reason': 'Forgot to clock in', 'status': 'PENDING'}
            )

        # 4. Leaves
        LeaveBalance.objects.update_or_create(
            employee=employee, year=today.year, 
            defaults={'total_days': 12, 'used_days': 0}
        )
        print(f"      ✅ Seeded attendance for {employee.email}")
