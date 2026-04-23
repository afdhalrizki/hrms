from datetime import date, time, timedelta
from django.urls import reverse
from core.tests.base import HRMSTestCase as TenantTestCase
from django_tenants.utils import schema_context
from rest_framework import status
from rest_framework.test import APIClient
from django.core.files.uploadedfile import SimpleUploadedFile
from core.models import Employee, Department, Branch
from attendance.models import Attendance, Shift, Schedule
from users.models import User
from tenants.models import Tenant

class BiometricFallbackTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        
        with schema_context(self.tenant.schema_name):
            self.branch = Branch.objects.create(
                name='Test Branch',
                latitude='-6.200000',
                longitude='106.816666',
                radius_meters=1000
            )
            
            self.user = User.objects.create_user(email='admin@test.com', password='password')
            self.user.is_staff = True
            self.user.save()
            self.user.tenants.add(self.tenant)
            
            self.employee = Employee.objects.create(
                fullname='Test Employee',
                email='admin@test.com',
                branch=self.branch,
                nik='E001',
                ktp_number='111',
                join_date=date.today()
            )
            
            self.domain_name = self.tenant.domains.first().domain

    def test_biometric_enabled_saves_photo(self):
        """When biometric is enabled (default), a photo should be saved and skipped=False."""
        self.client.force_login(self.user)
        
        # Ensure enabled
        self.tenant.is_biometric_enabled = True
        self.tenant.save()
        
        url = reverse('attendance-list')
        fake_photo = SimpleUploadedFile("face.jpg", b"image_content", content_type="image/jpeg")
        
        payload = {
            'date': str(date.today()),
            'check_in': '08:00:00',
            'latitude_in': '-6.200000',
            'longitude_in': '106.816666',
            'photo_in': fake_photo
        }
        
        response = self.client.post(url, payload, format='multipart', SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        with schema_context(self.tenant.schema_name):
            att = Attendance.objects.get(id=response.data['id'])
            self.assertTrue(att.photo_in)
            self.assertFalse(att.biometric_skipped)

    def test_biometric_disabled_skips_photo(self):
        """When biometric is disabled, photo is NOT saved and skipped=True."""
        self.client.force_login(self.user)
        
        # Disable biometric
        self.tenant.is_biometric_enabled = False
        self.tenant.save()
        
        url = reverse('attendance-list')
        fake_photo = SimpleUploadedFile("face.jpg", b"image_content", content_type="image/jpeg")
        
        payload = {
            'date': str(date.today()),
            'check_in': '08:00:00',
            'latitude_in': '-6.200000',
            'longitude_in': '106.816666',
            'photo_in': fake_photo
        }
        
        response = self.client.post(url, payload, format='multipart', SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        with schema_context(self.tenant.schema_name):
            att = Attendance.objects.get(id=response.data['id'])
            self.assertFalse(att.photo_in) # Should be None or empty
            self.assertTrue(att.biometric_skipped)

    def test_biometric_audit_filtering(self):
        """Verify that the API can filter records by biometric_skipped status."""
        self.client.force_login(self.user)
        
        with schema_context(self.tenant.schema_name):
            # Create one skipped and one normal record
            Attendance.objects.create(
                employee=self.employee, 
                date=date.today() - timedelta(days=1),
                check_in=time(8,0),
                biometric_skipped=True
            )
            Attendance.objects.create(
                employee=self.employee, 
                date=date.today() - timedelta(days=2),
                check_in=time(8,0),
                biometric_skipped=False
            )
            
        url = reverse('attendance-list')
        
        # Test filter
        response = self.client.get(f"{url}?biometric_skipped=true", SERVER_NAME=self.domain_name)
        self.assertEqual(len(response.data), 1)
        self.assertTrue(response.data[0]['biometric_skipped'])

        response_false = self.client.get(f"{url}?biometric_skipped=false", SERVER_NAME=self.domain_name)
        self.assertEqual(len(response_false.data), 1)
        self.assertFalse(response_false.data[0]['biometric_skipped'])
