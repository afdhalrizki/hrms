import hashlib
import secrets
from datetime import date, time, datetime, timedelta, timezone as dt_timezone
from django.urls import reverse
from django.utils import timezone
from core.tests.base import HRMSTestCase as TenantTestCase
from django_tenants.utils import schema_context
from rest_framework import status
from rest_framework.test import APIClient
from core.models import Employee, Branch, APIKey
from attendance.models import Attendance, FingerprintDevice, DeviceAttendanceLog, Shift, Schedule
from users.models import User
from tenants.models import Tenant

class FingerprintIntegrationTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()

        with schema_context(self.tenant.schema_name):
            # Create a branch
            self.branch = Branch.objects.create(
                name='Cilandak Branch',
                latitude='-6.200000',
                longitude='106.816666',
                radius_meters=1000
            )

            # Create User
            self.user = User.objects.create_user(email='admin@hr.com', password='password')
            self.user.is_staff = True
            self.user.save()
            self.user.tenants.add(self.tenant)

            # Create Shift & Schedule
            self.shift = Shift.objects.create(
                name='Morning Shift',
                start_time=time(8, 0, 0),
                end_time=time(17, 0, 0),
                is_flexible=False
            )

            # Create Employee with biometric_pin
            self.employee = Employee.objects.create(
                fullname='Budi Santoso',
                email='budi@hr.com',
                branch=self.branch,
                nik='NIK999',
                ktp_number='9999',
                join_date=date.today(),
                biometric_pin='1001'
            )

            self.schedule = Schedule.objects.create(
                employee=self.employee,
                date=date.today(),
                shift=self.shift
            )

            # Create Fingerprint Device
            self.device = FingerprintDevice.objects.create(
                name='Main Entrance ZKTeco',
                device_model='UFace 800',
                serial_number='ZK-SN-12345',
                branch=self.branch,
                is_active=True
            )

            # Create API Key for the device agent
            secret = secrets.token_urlsafe(32)
            prefix = secrets.token_hex(4)
            key_hash = hashlib.sha256(secret.encode()).hexdigest()
            self.api_key = APIKey.objects.create(
                label='ZKTeco Agent Key',
                key_prefix=prefix,
                key_hash=key_hash,
                is_active=True
            )
            self.raw_api_key = f"{prefix}.{secret}"

            self.domain_name = self.tenant.domains.first().domain

    def test_fingerprint_policy_disabled_by_default(self):
        """Should deny device log uploads if is_fingerprint_enabled is False"""
        self.tenant.is_fingerprint_enabled = False
        self.tenant.save()

        url = reverse('deviceattendancelog-list')
        payload = {
            'device_serial': 'ZK-SN-12345',
            'logs': [
                {
                    'biometric_pin': '1001',
                    'timestamp': '2026-05-21T08:00:00+07:00',
                    'verification_mode': 1,
                    'in_out_state': 'IN'
                }
            ]
        }
        
        self.client.credentials(HTTP_X_API_KEY=self.raw_api_key)
        response = self.client.post(url, payload, format='json', SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_fingerprint_policy_enabled(self):
        """Should accept logs and process them when is_fingerprint_enabled is True"""
        self.tenant.is_fingerprint_enabled = True
        self.tenant.save()

        url = reverse('deviceattendancelog-list')
        payload = {
            'device_serial': 'ZK-SN-12345',
            'logs': [
                {
                    'biometric_pin': '1001',
                    'timestamp': '2026-05-21T08:00:00+07:00',
                    'verification_mode': 1,
                    'in_out_state': 'IN'
                }
            ]
        }
        
        self.client.credentials(HTTP_X_API_KEY=self.raw_api_key)
        response = self.client.post(url, payload, format='json', SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['inserted'], 1)
        self.assertEqual(response.data['processed'], 1)

        # Check if Attendance was created
        with schema_context(self.tenant.schema_name):
            attendance = Attendance.objects.filter(employee=self.employee, date=date(2026, 5, 21)).first()
            self.assertIsNotNone(attendance)
            self.assertEqual(attendance.verification_method, 'FINGERPRINT')
            self.assertEqual(attendance.status, 'PRESENT')

    def test_invalid_device_serial(self):
        """Should reject uploads with invalid serial number"""
        self.tenant.is_fingerprint_enabled = True
        self.tenant.save()

        url = reverse('deviceattendancelog-list')
        payload = {
            'device_serial': 'WRONG-SERIAL',
            'logs': []
        }
        self.client.credentials(HTTP_X_API_KEY=self.raw_api_key)
        response = self.client.post(url, payload, format='json', SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_device_crud_restricted_by_rbac(self):
        """HR / Admin should be able to perform CRUD on FingerprintDevice, regular employee should not"""
        self.client.force_login(self.user)
        url = reverse('fingerprintdevice-list')
        
        # Test creation by Admin
        payload = {
            'name': 'Back Office ZK',
            'device_model': 'K40',
            'serial_number': 'ZK-SN-BACKOFFICE',
            'branch': self.branch.id,
            'is_active': True
        }
        response = self.client.post(url, payload, format='json', SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Test regular employee cannot CRUD
        regular_user = User.objects.create_user(email='employee@hr.com', password='password')
        # Assign employee
        with schema_context(self.tenant.schema_name):
            Employee.objects.create(
                fullname='Employee User',
                email='employee@hr.com',
                branch=self.branch,
                nik='NIK777',
                join_date=date.today()
            )
        
        self.client.force_login(regular_user)
        response = self.client.post(url, payload, format='json', SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_process_device_logs_multiple(self):
        """Should correctly handle IN and OUT log state sequences (explicit worker check)"""
        with schema_context(self.tenant.schema_name):
            # Create a log with IN state
            log_in = DeviceAttendanceLog.objects.create(
                device=self.device,
                biometric_pin='1001',
                timestamp=datetime(2026, 5, 21, 1, 5, 0, tzinfo=dt_timezone.utc),
                verification_mode=1,
                in_out_state='IN'
            )

            # Create a log with OUT state
            log_out = DeviceAttendanceLog.objects.create(
                device=self.device,
                biometric_pin='1001',
                timestamp=datetime(2026, 5, 21, 10, 10, 0, tzinfo=dt_timezone.utc),
                verification_mode=1,
                in_out_state='OUT'
            )

            from attendance.services import AttendanceService
            processed = AttendanceService.process_device_logs()
            self.assertEqual(processed, 2)

            # Refresh logs
            log_in.refresh_from_db()
            log_out.refresh_from_db()
            self.assertTrue(log_in.is_processed)
            self.assertTrue(log_out.is_processed)

            # Check Attendance record
            attendance = Attendance.objects.get(employee=self.employee, date=date(2026, 5, 21))
            self.assertEqual(attendance.verification_method, 'FINGERPRINT')
            self.assertEqual(attendance.check_in, time(8, 5, 0)) # converted to local tz (Asia/Jakarta +07:00 from UTC)
            self.assertEqual(attendance.check_out, time(17, 10, 0)) # converted to local tz (Asia/Jakarta +07:00 from UTC)
            self.assertEqual(attendance.status, 'LATE') # Checked in at 08:05 (late for 08:00 morning shift)

    def test_import_logs_xlsx(self):
        """Should import logs from excel file correctly"""
        self.tenant.is_fingerprint_enabled = True
        self.tenant.save()

        import pandas as pd
        from io import BytesIO
        from django.core.files.uploadedfile import SimpleUploadedFile

        # Create mock data
        data = {
            'biometric_pin': ['1001', '1001'],
            'timestamp': ['2026-05-21 08:15:00', '2026-05-21 17:30:00'],
            'in_out_state': ['IN', 'OUT'],
            'device_serial': ['ZK-SN-12345', 'ZK-SN-12345']
        }
        df = pd.DataFrame(data)
        
        # Write to memory buffer
        out = BytesIO()
        with pd.ExcelWriter(out, engine='openpyxl') as writer:
            df.to_excel(writer, index=False)
        out.seek(0)

        # Create uploaded file
        uploaded_file = SimpleUploadedFile(
            'logs.xlsx',
            out.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

        url = reverse('fingerprintdevice-import-logs')
        self.client.force_login(self.user)
        
        response = self.client.post(url, {'file': uploaded_file}, format='multipart', SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')
        self.assertEqual(response.data['received'], 2)
        
        # Verify database
        with schema_context(self.tenant.schema_name):
            attendance = Attendance.objects.filter(employee=self.employee, date=date(2026, 5, 21)).first()
            self.assertIsNotNone(attendance)
            self.assertEqual(attendance.verification_method, 'FINGERPRINT')
            self.assertEqual(attendance.check_in, time(8, 15, 0))
            self.assertEqual(attendance.check_out, time(17, 30, 0))

