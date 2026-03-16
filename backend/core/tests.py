from datetime import date
from django.urls import reverse
from django_tenants.test.cases import TenantTestCase
from django_tenants.utils import schema_context
from rest_framework import status
from rest_framework.test import APIClient
from core.models import Department, Role, Golongan, Employee
from users.models import User

class CoreModuleTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        
        with schema_context(self.tenant.schema_name):
            # 1. Setup Master Data
            self.dept = Department.objects.create(name='Human Resources', description='HR Department')
            self.role = Role.objects.create(name='Manager', department=self.dept)
            self.golongan = Golongan.objects.create(
                name='IIIA', 
                base_salary=5000000, 
                meal_allowance=25000, 
                transport_allowance=15000
            )
            
            # 2. Setup User & Employee
            self.user = User.objects.create_user(email='admin@company.com', password='password')
            self.user.tenants.add(self.tenant)
            
            self.employee = Employee.objects.create(
                nik='EMP001',
                fullname='John Doe',
                email='john@company.com',
                department=self.dept,
                role=self.role,
                golongan=self.golongan,
                join_date=date.today(),
                ktp_number='1234567890123456',
                ptkp_status='TK/0'
            )
            
            # Domain for SERVER_NAME
            self.domain_name = self.tenant.domains.first().domain

    def test_department_api(self):
        """Test Department CRUD via API."""
        self.client.force_login(self.user)
        url = reverse('department-list')
        
        # List
        response = self.client.get(url, SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        
        # Create
        payload = {'name': 'IT', 'description': 'IT Department'}
        response = self.client.post(url, payload, format='json', SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Department.objects.count(), 2)

    def test_role_api(self):
        """Test Role relationships via API."""
        self.client.force_login(self.user)
        url = reverse('role-list')
        
        payload = {
            'name': 'Senior Developer',
            'department': self.dept.id,
            'description': 'Senior role'
        }
        response = self.client.post(url, payload, format='json', SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Role.objects.get(name='Senior Developer').department, self.dept)

    def test_golongan_api(self):
        """Test Golongan salary fields."""
        self.client.force_login(self.user)
        url = reverse('golongan-list')
        
        payload = {
            'name': 'IVB',
            'base_salary': '7500000.00',
            'meal_allowance': '30000.00',
            'transport_allowance': '20000.00'
        }
        response = self.client.post(url, payload, format='json', SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        gol = Golongan.objects.get(name='IVB')
        self.assertEqual(float(gol.base_salary), 7500000.0)

    def test_employee_api(self):
        """Test Employee creation and unique constraints."""
        self.client.force_login(self.user)
        url = reverse('employee-list')
        
        payload = {
            'nik': 'EMP002',
            'fullname': 'Jane Smith',
            'email': 'jane@company.com',
            'department': self.dept.id,
            'role': self.role.id,
            'golongan': self.golongan.id,
            'join_date': str(date.today()),
            'ktp_number': '0000000000000000',
            'ptkp_status': 'K/1'
        }
        response = self.client.post(url, payload, format='json', SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Test Duplicate NIK
        response = self.client.post(url, payload, format='json', SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_employee_detail_fields(self):
        """Ensure all fields are correctly saved and retrieved."""
        self.client.force_login(self.user)
        url = reverse('employee-detail', kwargs={'pk': self.employee.id})
        
        response = self.client.get(url, SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['nik'], 'EMP001')
        self.assertEqual(response.data['ptkp_status'], 'TK/0')

class MultiTenancyIsolationTestCase(TenantTestCase):
    def test_schema_isolation(self):
        """Verify that data created in one tenant is not visible in another."""
        with schema_context(self.tenant.schema_name):
            Department.objects.create(name="Tenant Specific Dept")
            self.assertEqual(Department.objects.count(), 1)

        with schema_context('public'):
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT count(*) FROM information_schema.tables WHERE table_name = 'core_department' AND table_schema = 'public'")
                count = cursor.fetchone()[0]
                self.assertEqual(count, 0)
