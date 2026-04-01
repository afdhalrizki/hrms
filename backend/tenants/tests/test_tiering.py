from rest_framework.test import APIClient
from django_tenants.test.cases import TenantTestCase
from django_tenants.utils import schema_context
from django.contrib.auth import get_user_model
from django.urls import reverse
from core.models import Employee, Department
from tenants.models import Tenant

User = get_user_model()

class TieringAccessTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.domain_name = self.tenant.domains.first().domain
        
        # Setup tenant as BASIC
        self.tenant.plan_type = 'BASIC'
        self.tenant.enabled_modules = ['core', 'attendance']
        self.tenant.max_employees = 2
        self.tenant.save()
        
        # Create user
        self.user = User.objects.create_user(
            email='admin@basictether.com',
            password='password123',
            is_staff=True # Admin in this tenant
        )
        self.user.tenants.add(self.tenant)
        self.client.force_login(self.user)

    def test_basic_tier_restrictions(self):
        """BASIC tier should NOT have access to payroll."""
        with schema_context(self.tenant.schema_name):
            url = reverse('payrollperiod-list')
            response = self.client.get(url, SERVER_NAME=self.domain_name)
            # Should be forbidden because 'payroll' module is not enabled
            # Note: FeatureRequiredPermission returns False -> DRF returns 403
            self.assertEqual(response.status_code, 403)

    def test_professional_tier_access(self):
        """PROFESSIONAL tier SHOULD have access to payroll."""
        self.tenant.plan_type = 'PROFESSIONAL'
        self.tenant.enabled_modules = ['core', 'attendance', 'payroll']
        self.tenant.save()
        
        with schema_context(self.tenant.schema_name):
            url = reverse('payrollperiod-list')
            response = self.client.get(url, SERVER_NAME=self.domain_name)
            self.assertNotEqual(response.status_code, 403)

    def test_employee_quota_enforcement(self):
        """Should block employee creation if quota is exceeded."""
        self.tenant.max_employees = 1
        self.tenant.save()
        
        with schema_context(self.tenant.schema_name):
            # 1. Create first employee (allowed)
            dept = Department.objects.create(name='IT')
            Employee.objects.create(fullname='Emp 1', email='emp1@test.com', nik='001', department=dept, join_date='2024-01-01')
            
            # 2. Try to create second employee via API (blocked)
            url = reverse('employee-list')
            payload = {
                'fullname': 'Emp 2', 'email': 'emp2@test.com', 'nik': '002',
                'department': dept.id, 'join_date': '2023-01-01'
            }
            response = self.client.post(url, payload, format='json', SERVER_NAME=self.domain_name)
            self.assertEqual(response.status_code, 403)

    def test_mobile_lite_serialization(self):
        """Verify that ?lite=true returns fewer fields."""
        with schema_context(self.tenant.schema_name):
            dept = Department.objects.create(name='Mobile')
            Employee.objects.create(fullname='Emp Lite', email='lite@test.com', nik='LITE', department=dept, join_date='2024-01-01')
            
            url = reverse('employee-list')
            response = self.client.get(url, {'lite': 'true'}, SERVER_NAME=self.domain_name)
            self.assertEqual(response.status_code, 200)
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                emp = data[0]
                # 'fullname' exists, but complex fields like 'golongan_name' should not be in Lite
                self.assertIn('fullname', emp)
                self.assertNotIn('golongan_name', emp)
