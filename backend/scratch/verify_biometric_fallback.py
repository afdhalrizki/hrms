import os
import django
from decimal import Decimal
from django.utils import timezone
from datetime import date, time

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django_tenants.utils import schema_context
from tenants.models import Tenant
from attendance.models import Attendance
from core.models import Employee
from attendance.services import AttendanceService

def test_biometric_fallback():
    # Use existing tenant 'company1'
    tenant = Tenant.objects.get(schema_name='company1')
    
    with schema_context('company1'):
        employee = Employee.objects.first()
        if not employee:
            print("No employee found in company1. Skipping test.")
            return

        print(f"Testing with Employee: {employee.fullname}")
        
        # 1. Test with Biometric ENABLED (Default)
        tenant.is_biometric_enabled = True
        tenant.save()
        
        # Cleanup today's attendance
        Attendance.objects.filter(employee=employee, date=date.today()).delete()
        
        from django.core.files.uploadedfile import SimpleUploadedFile
        fake_photo = SimpleUploadedFile("test.jpg", b"fake image content", content_type="image/jpeg")

        print("--- Case 1: Biometric Enabled ---")
        att1 = AttendanceService.process_clock_in(
            employee=employee,
            latitude=-6.2,
            longitude=106.8,
            photo=fake_photo
        )
        print(f"Attendance ID: {att1.id}, Photo: {att1.photo_in}, Skipped: {att1.biometric_skipped}")
        
        # 2. Test with Biometric DISABLED
        tenant.is_biometric_enabled = False
        tenant.save()
        
        tomorrow = today + timezone.timedelta(days=1)
        print(f"\n--- Case 2: Biometric Disabled (Fallback) for {tomorrow} ---")
        att2 = AttendanceService.process_clock_in(
            employee=employee,
            latitude=-6.2,
            longitude=106.8,
            photo="should_be_ignored",
            date=tomorrow
        )
        print(f"Attendance ID: {att2.id}, Photo: {att2.photo_in}, Skipped: {att2.biometric_skipped}")
        
        if att2.photo_in is None and att2.biometric_skipped is True:
            print("\nSUCCESS: Biometric fallback works correctly!")
        else:
            print("\nFAILURE: Biometric fallback did not work as expected.")

if __name__ == "__main__":
    test_biometric_fallback()
