import math
from decimal import Decimal
from django.utils import timezone
from .models import Attendance, Schedule, Shift

class AttendanceService:
    @staticmethod
    def calculate_distance(lat1, lon1, lat2, lon2):
        """
        Calculate the great circle distance between two points 
        on the earth (specified in decimal degrees) using Haversine formula.
        Returns distance in meters.
        """
        # Convert decimal degrees to radians 
        lat1, lon1, lat2, lon2 = map(math.radians, [float(lat1), float(lon1), float(lat2), float(lon2)])

        # Haversine formula 
        dlon = lon2 - lon1 
        dlat = lat2 - lat1 
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a)) 
        r = 6371000 # Radius of earth in meters
        return c * r

    @staticmethod
    def validate_location(employee, latitude, longitude):
        """
        Validates if the employee is within the allowed radius of their assigned branch.
        """
        if not employee.branch:
            return True, 0 # No branch assigned, no fencing

        try:
            lat = float(latitude)
            lon = float(longitude)
        except (ValueError, TypeError, AttributeError):
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'detail': 'Invalid coordinate format.'})

        branch = employee.branch
        distance = AttendanceService.calculate_distance(
            lat, lon, 
            branch.latitude, branch.longitude
        )
        
        # If radius is 0, employee must be exactly at the coordinate (rare but possible boundary)
        is_in_bounds = distance <= branch.radius_meters
        return is_in_bounds, distance

    @staticmethod
    def get_calculated_status(employee, check_in_time, date, is_in_bounds=True):
        """
        Determines what the status should be based on time and location.
        """
        status = 'PRESENT'
        if not is_in_bounds:
            status = 'OFF_SITE'
            
        # Find schedule for that date
        schedule = Schedule.objects.filter(employee=employee, date=date).first()
        if schedule:
            shift = schedule.shift
            # Check for lateness if not flexible
            if not shift.is_flexible:
                if check_in_time and check_in_time > shift.start_time:
                    status = 'LATE' if is_in_bounds else 'OFF_SITE'
        else:
            from datetime import time
            default_start = time(8, 0)
            if check_in_time and check_in_time > default_start:
                status = 'LATE' if is_in_bounds else 'OFF_SITE'
        
        return status

    @staticmethod
    def process_clock_in(employee, latitude, longitude, photo=None, check_in_time=None, date=None):
        """
        Handles the clock-in logic including geofencing and shift mapping.
        """
        today = date if date else timezone.now().date()
        now_time = check_in_time if check_in_time else timezone.now().time()
        
        is_in_bounds, distance = AttendanceService.validate_location(employee, latitude, longitude)
        
        # Determine status using helper
        status = AttendanceService.get_calculated_status(employee, now_time, today, is_in_bounds)

        if Attendance.objects.filter(employee=employee, date=today).exists():
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'detail': 'Attendance already recorded for this date.'})

        # Check for approved leave conflict
        from .models import LeaveRequest
        leave_exists = LeaveRequest.objects.filter(
            employee=employee, 
            status='APPROVED',
            start_date__lte=today,
            end_date__gte=today
        ).exists()

        if leave_exists:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'detail': f'Cannot record attendance. Employee is on an APPROVED leave for {today}.'})

        from django.db import connection
        from django_tenants.utils import get_tenant_model
        tenant = get_tenant_model().objects.get(schema_name=connection.schema_name)
        
        final_photo = photo
        skipped = False
        
        # Calculate incoming photo size if present
        photo_size = 0
        if photo:
            try:
                photo_size = photo.size
            except (AttributeError, ValueError):
                photo_size = 0

        # Check if storage is already full OR if this photo will make it exceed the limit
        storage_full = (tenant.storage_used_bytes + photo_size) > tenant.total_storage_capacity_bytes
        
        if not getattr(tenant, 'is_biometric_enabled', True) or storage_full:
            final_photo = None
            skipped = True

        attendance = Attendance.objects.create(
            employee=employee,
            date=today,
            branch=employee.branch,
            check_in=now_time,
            latitude_in=latitude,
            longitude_in=longitude,
            photo_in=final_photo,
            status=status,
            is_out_of_bounds=not is_in_bounds,
            biometric_skipped=skipped,
            distance_from_branch=distance
        )
        return attendance

    @staticmethod
    def process_clock_out(employee, latitude, longitude, photo=None, check_out_time=None, date=None):
        """
        Handles the clock-out logic for an existing attendance record.
        """
        today = date if date else timezone.now().date()
        now_time = check_out_time if check_out_time else timezone.now().time()
        
        attendance = Attendance.objects.filter(employee=employee, date=today).first()
        if not attendance:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'detail': 'No clock-in record found for today.'})
            
        if attendance.check_out:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'detail': 'Already clocked out for today.'})
            
        attendance.check_out = now_time
        attendance.latitude_out = latitude
        attendance.longitude_out = longitude
        if photo:
            attendance.photo_out = photo
            
        attendance.save()
        return attendance

    @staticmethod
    def recalculate_attendance_status(attendance):
        """
        Force recalculates the status of an existing attendance record.
        Useful after manual corrections.
        """
        is_in_bounds = not attendance.is_out_of_bounds
        new_status = AttendanceService.get_calculated_status(
            attendance.employee, 
            attendance.check_in, 
            attendance.date, 
            is_in_bounds
        )
        if attendance.status != new_status:
            attendance.status = new_status
            attendance.save(update_fields=['status'])
        return attendance
