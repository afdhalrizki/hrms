from datetime import date, time
from django_tenants.test.cases import FastTenantTestCase as TenantTestCase
from django_tenants.utils import schema_context
from attendance.models import Attendance
from core.models import Employee, Department, Branch
from attendance.services import AttendanceService
from decimal import Decimal

class StorageFallbackTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        with schema_context(self.tenant.schema_name):
            self.dept = Department.objects.create(name='IT')
            self.branch = Branch.objects.create(
                name='Office', 
                latitude=Decimal('0'), 
                longitude=Decimal('0'), 
                radius_meters=100
            )
            self.employee = Employee.objects.create(
                fullname='Test Employee', 
                email='test@example.com', 
                department=self.dept, 
                branch=self.branch,
                nik='T001', 
                ktp_number='123456789', 
                join_date=date.today()
            )

    def test_automatic_biometric_skip_when_quota_full(self):
        """
        Verify that AttendanceService automatically skips biometric (discards photo)
        if the tenant's storage quota is already full.
        """
        # 1. Simulate full storage
        # 100MB limit and 100MB used
        self.tenant.storage_limit_mb = 100
        self.tenant.extra_storage_mb = 0
        self.tenant.storage_used_bytes = 100 * 1024 * 1024
        self.tenant.save()
        
        with schema_context(self.tenant.schema_name):
            # 2. Perform clock-in with a photo
            from django.core.files.base import ContentFile
            photo = ContentFile(b"fake image content", name="attempted_photo.jpg")
            
            att = AttendanceService.process_clock_in(
                employee=self.employee,
                latitude=0,
                longitude=0,
                photo=photo,
                date=date.today(),
                check_in_time=time(7, 0)
            )
            
            # 3. Assertions
            # The photo should have been cleared (empty / False) because storage is full
            self.assertFalse(bool(att.photo_in))
            self.assertTrue(att.biometric_skipped)
            self.assertEqual(att.status, 'PRESENT')

    def test_normal_biometric_when_quota_not_full(self):
        """
        Verify that biometric is NOT skipped if quota is still available.
        """
        # 1. Ensure quota is not full
        self.tenant.storage_limit_mb = 100
        self.tenant.storage_used_bytes = 50 * 1024 * 1024 # 50% used
        self.tenant.save()
        
        with schema_context(self.tenant.schema_name):
            # 2. Perform clock-in
            # Using a different date to avoid unique constraint if run in same suite
            future_date = date.today() + date.resolution
            from django.core.files.base import ContentFile
            photo = ContentFile(b"fake image content", name="valid_photo.jpg")
            
            att = AttendanceService.process_clock_in(
                employee=self.employee,
                latitude=0,
                longitude=0,
                photo=photo,
                date=future_date
            )
            
            # 3. Assertions
            # Photo should be preserved
            self.assertTrue(bool(att.photo_in))
            self.assertFalse(att.biometric_skipped)

    def test_attendance_checkin_quota_near_limit_overflow(self):
        """
        Verify that if the photo size would exceed the remaining quota,
        the photo is discarded and biometric_skipped is set to True.
        """
        # 1. Quota has 5KB left
        self.tenant.storage_limit_mb = 100
        self.tenant.extra_storage_mb = 0
        self.tenant.storage_used_bytes = (100 * 1024 * 1024) - 5000 
        self.tenant.save()
        
        with schema_context(self.tenant.schema_name):
            # 2. Attempt clock-in with a 10KB photo
            from django.core.files.base import ContentFile
            photo = ContentFile(b"X" * 10000, name="large_photo.jpg")
            
            # Using a unique date
            test_date = date.today() + date.resolution * 2
            
            att = AttendanceService.process_clock_in(
                employee=self.employee,
                latitude=0,
                longitude=0,
                photo=photo,
                date=test_date
            )
            
            # 3. Assertions
            # Should be skipped because it would exceed quota
            self.assertFalse(bool(att.photo_in))
            self.assertTrue(att.biometric_skipped)
