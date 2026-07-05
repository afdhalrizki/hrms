import logging
from datetime import datetime
from celery import shared_task
from django_tenants.utils import schema_context
from tenants.models import Tenant
from core.models import Employee
from attendance.models import Attendance, Schedule, LeaveRequest

logger = logging.getLogger(__name__)

@shared_task
def check_absences_for_all_tenants(date_str=None):
    """
    Cron task that runs across all schemas to mark employees as ABSENT if they 
    have a scheduled shift on target_date but haven't clocked in.
    """
    if date_str:
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    else:
        from django.utils import timezone
        target_date = timezone.localdate()

    logger.info(f"Starting check_absences_for_all_tenants for date: {target_date}")
    
    # Exclude public schema
    tenants = Tenant.objects.exclude(schema_name='public')
    total_marked = 0
    
    for tenant in tenants:
        with schema_context(tenant.schema_name):
            # 1. Get all active employees (exclude TERMINATED and RESIGNED)
            active_employees = Employee.objects.exclude(status__in=['TERMINATED', 'RESIGNED'])
            
            for employee in active_employees:
                # Check if employee has schedule for target_date
                has_schedule = Schedule.objects.filter(employee=employee, date=target_date).exists()
                if not has_schedule:
                    continue # Not scheduled to work, don't mark as absent
                
                # Check if there is already an attendance record for target_date
                attendance_exists = Attendance.objects.filter(employee=employee, date=target_date).exists()
                if attendance_exists:
                    continue # Already has check-in, check-out, or manual record
                
                # Check if there is an APPROVED leave request for target_date
                has_approved_leave = LeaveRequest.objects.filter(
                    employee=employee,
                    status='APPROVED',
                    start_date__lte=target_date,
                    end_date__gte=target_date
                ).exists()
                if has_approved_leave:
                    continue # Karyawan sedang cuti yang disetujui, bukan alpa
                
                # Create ABSENT attendance record
                Attendance.objects.create(
                    employee=employee,
                    date=target_date,
                    branch=employee.branch,
                    status='ABSENT',
                )
                total_marked += 1
                logger.info(f"Marked {employee.fullname} as ABSENT on {target_date} for tenant {tenant.schema_name}")

    return f"Completed absence checking. Marked {total_marked} records as ABSENT."
