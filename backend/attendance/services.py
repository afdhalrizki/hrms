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
    def process_clock_in(employee, latitude, longitude, photo=None, check_in_time=None, date=None):
        """
        Handles the clock-in logic including geofencing and shift mapping.
        """
        today = date if date else timezone.now().date()
        now_time = check_in_time if check_in_time else timezone.now().time()
        
        is_in_bounds, distance = AttendanceService.validate_location(employee, latitude, longitude)
        
        # Determine status
        status = 'PRESENT'
        if not is_in_bounds:
            status = 'OFF_SITE'
            
        # Find schedule for today
        schedule = Schedule.objects.filter(employee=employee, date=today).first()
        if schedule:
            shift = schedule.shift
            # Check for lateness if not flexible
            if not shift.is_flexible:
                if now_time > shift.start_time:
                    status = 'LATE' if is_in_bounds else 'OFF_SITE'
        else:
            from datetime import time
            default_start = time(8, 0)
            if now_time > default_start:
                status = 'LATE' if is_in_bounds else 'OFF_SITE'

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

        attendance = Attendance.objects.create(
            employee=employee,
            date=today,
            branch=employee.branch,
            check_in=now_time,
            latitude_in=latitude,
            longitude_in=longitude,
            photo_in=photo,
            status=status,
            is_out_of_bounds=not is_in_bounds,
            distance_from_branch=distance
        )
        return attendance
