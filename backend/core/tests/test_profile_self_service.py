from datetime import date
from django.urls import reverse
from core.tests.base import HRMSTestCase as TenantTestCase
from django_tenants.utils import schema_context
from rest_framework import status
from rest_framework.test import APIClient
from core.models import Department, Role, Grade, Employee
from users.models import User

class EmployeeProfileSelfServiceTest(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        
        with schema_context(self.tenant.schema_name):
            # 1. Setup Master Data
            self.dept = Department.objects.create(name='Technology')
            self.role = Role.objects.create(name='Developer', department=self.dept)
            self.gol = Grade.objects.create(name='IIIA', base_salary=5000000)
            
            # 2. Setup Employee User (Standard)
            self.user = User.objects.create_user(email='emp@test.com', password='password')
            self.user.tenants.add(self.tenant)
            
            self.employee = Employee.objects.create(
                nik='EMP-70-001',
                fullname='Employee Seventy',
                email='emp@test.com',
                department=self.dept,
                role=self.role,
                grade=self.gol,
                join_date=date.today(),
                ktp_number='KTPS70001',
                ptkp_status='TK/0'
            )
            
            # 3. Setup Another Employee (To test isolation)
            self.other_user = User.objects.create_user(email='other@test.com', password='password')
            self.other_user.tenants.add(self.tenant)
            self.other_employee = Employee.objects.create(
                nik='EMP-70-002',
                fullname='Other Employee',
                email='other@test.com',
                department=self.dept,
                role=self.role,
                grade=self.gol,
                join_date=date.today(),
                ktp_number='KTPS70002'
            )

            # 4. Setup Admin User
            self.admin = User.objects.create_user(email='admin@test.com', password='password', is_staff=True)
            self.admin.tenants.add(self.tenant)
            self.admin_employee = Employee.objects.create(
                nik='EMP-70-003',
                fullname='Admin Employee',
                email='admin@test.com',
                department=self.dept,
                role=self.role,
                grade=self.gol,
                join_date=date.today(),
                ktp_number='KTPS70003'
            )
            
            self.domain = self.tenant.domains.first().domain

    def test_employee_can_update_own_profile(self):
        """Verify that an employee can update their own permitted fields."""
        self.client.force_login(self.user)
        url = reverse('employee-detail', kwargs={'pk': self.employee.id})
        
        payload = {
            'phone': '08123456789',
            'address': 'Jl. Keadilan No. 70',
            'ptkp_status': 'K/1',
            'npwp_number': 'NPWP70001'
        }
        
        response = self.client.patch(url, payload, format='json', SERVER_NAME=self.domain)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify db
        self.employee.refresh_from_db()
        self.assertEqual(self.employee.phone, '08123456789')
        self.assertEqual(self.employee.address, 'Jl. Keadilan No. 70')
        self.assertEqual(self.employee.ptkp_status, 'K/1')

    def test_employee_cannot_update_restricted_fields(self):
        """Verify that administrative fields remain unchanged even if sent by employee."""
        self.client.force_login(self.user)
        url = reverse('employee-detail', kwargs={'pk': self.employee.id})
        
        old_nik = self.employee.nik
        payload = {
            'nik': 'HACKED-NIK',
            'fullname': 'Hacked Name',
            'email': 'hacked@evil.com'
        }
        
        # DRF will ignore these fields because they are read_only in EmployeeProfileSerializer
        response = self.client.patch(url, payload, format='json', SERVER_NAME=self.domain)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.employee.refresh_from_db()
        self.assertEqual(self.employee.nik, old_nik)
        self.assertEqual(self.employee.fullname, 'Employee Seventy')
        self.assertEqual(self.employee.email, 'emp@test.com')

    def test_employee_cannot_update_others_profile(self):
        """Verify that an employee is forbidden from updating another employee's record."""
        self.client.force_login(self.user) # Login as user 1
        url = reverse('employee-detail', kwargs={'pk': self.other_employee.id}) # Target user 2
        
        payload = {'phone': '089999999'}
        response = self.client.patch(url, payload, format='json', SERVER_NAME=self.domain)
        
        # HasTenantRBACPermission (is_owner) should return False for other records,
        # but because get_queryset is restrictive, it will return 404.
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_can_update_everything(self):
        """Verify that an admin (staff) can still update restricted fields like NIK."""
        self.client.force_login(self.admin)
        url = reverse('employee-detail', kwargs={'pk': self.employee.id})
        
        payload = {
            'nik': 'EMP-PRO-001',
            'fullname': 'Promoted Name'
        }
        
        response = self.client.patch(url, payload, format='json', SERVER_NAME=self.domain)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.employee.refresh_from_db()
        self.assertEqual(self.employee.nik, 'EMP-PRO-001')
        self.assertEqual(self.employee.fullname, 'Promoted Name')

    def test_employee_can_upload_documents(self):
        """Verify that an employee can upload KTP and NPWP images."""
        from django.core.files.uploadedfile import SimpleUploadedFile
        self.client.force_login(self.user)
        url = reverse('employee-detail', kwargs={'pk': self.employee.id})
        
        # Create dummy image content
        image_content = b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x00\x00\x00\x21\xf9\x04\x01\x0a\x00\x01\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02\x4c\x01\x00\x3b'
        ktp_file = SimpleUploadedFile("ktp.png", image_content, content_type="image/png")
        npwp_file = SimpleUploadedFile("npwp.png", image_content, content_type="image/png")
        
        payload = {
            'ktp_image': ktp_file,
            'npwp_image': npwp_file,
            'address': 'New Address for upload test'
        }
        
        # Use multipart/form-data for file upload
        response = self.client.patch(url, payload, format='multipart', SERVER_NAME=self.domain)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.employee.refresh_from_db()
        self.assertTrue(bool(self.employee.ktp_image))
        self.assertTrue(bool(self.employee.npwp_image))
        self.assertEqual(self.employee.address, 'New Address for upload test')

    def test_admin_cannot_delete_own_employee_profile(self):
        """Verify that an admin cannot delete their own employee profile."""
        self.client.force_login(self.admin)
        url = reverse('employee-detail', kwargs={'pk': self.admin_employee.id})
        
        response = self.client.delete(url, SERVER_NAME=self.domain)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Cannot delete your own employee profile.", str(response.data))
        
        # Verify it still exists in db
        self.assertTrue(Employee.objects.filter(id=self.admin_employee.id).exists())

    def test_admin_can_delete_other_employee_profile(self):
        """Verify that an admin can delete another employee's profile."""
        self.client.force_login(self.admin)
        url = reverse('employee-detail', kwargs={'pk': self.employee.id})
        
        response = self.client.delete(url, SERVER_NAME=self.domain)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify it is deleted from db
        self.assertFalse(Employee.objects.filter(id=self.employee.id).exists())
        with schema_context('public'):
            self.assertFalse(User.objects.filter(email='emp@test.com').exists())

    def test_standard_employee_cannot_delete_any_employee_profile(self):
        """Verify that a standard employee cannot delete any employee profile (including their own)."""
        self.client.force_login(self.user)
        url = reverse('employee-detail', kwargs={'pk': self.employee.id})
        
        response = self.client.delete(url, SERVER_NAME=self.domain)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
