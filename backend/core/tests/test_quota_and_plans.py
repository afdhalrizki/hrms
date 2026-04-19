import datetime
from decimal import Decimal
from django_tenants.test.cases import TenantTestCase
from django.test import RequestFactory
from rest_framework.test import APIClient
from django.urls import reverse
from rest_framework import status
from tenants.models import Tenant
from core.models import Employee, Department, Role
from django.contrib.auth import get_user_model

User = get_user_model()

class TenantQuotaAndPlansTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.admin = User.objects.create_superuser(email='sysadmin@test.com', password='pwd')
        self.client.force_authenticate(user=self.admin)
        
        self.dept = Department.objects.create(name='IT')
        self.role = Role.objects.create(name='Staff', department=self.dept)

    def test_tenant_default_plans_and_quotas(self):
        """Test how tenants assign default modules and quotas on creation, overriding default 1000 limit."""
        from django_tenants.utils import schema_context, get_public_schema_name
        
        with schema_context(get_public_schema_name()):
            # Essential Plan
            t_essential = Tenant(schema_name='essential_tenant', name='Essential', plan_type='ESSENTIAL', max_employees=1000)
            t_essential.save()
            self.assertEqual(t_essential.max_employees, 50)
            self.assertIn('attendance', t_essential.enabled_modules)
            self.assertNotIn('payroll', t_essential.enabled_modules)
            self.assertFalse(t_essential.is_module_enabled('payroll'))
            self.assertTrue(t_essential.is_module_enabled('attendance'))
            
            # Professional Plan
            t_prof = Tenant(schema_name='prof_tenant', name='Prof', plan_type='PROFESSIONAL', max_employees=1000)
            t_prof.save()
            self.assertEqual(t_prof.max_employees, 500)
            self.assertIn('payroll', t_prof.enabled_modules)
            self.assertNotIn('performance', t_prof.enabled_modules)
            self.assertTrue(t_prof.is_module_enabled('payroll'))
            
            # Premium Plan
            t_prem = Tenant(schema_name='prem_tenant', name='Prem', plan_type='PREMIUM', max_employees=1000)
            t_prem.save()
            self.assertEqual(t_prem.max_employees, 2000)
            self.assertTrue(t_prem.is_module_enabled('performance'))
            self.assertNotIn('analytics', t_prem.enabled_modules)

            # Enterprise Plan
            t_ent = Tenant(schema_name='ent_tenant', name='Ent', plan_type='ENTERPRISE', max_employees=1000)
            t_ent.save()
            self.assertEqual(t_ent.max_employees, 10000) # Re-assigned by defaults
            self.assertTrue(t_ent.is_module_enabled('super_unknown_module')) # Enterprise has everything true

    def test_subscription_status_properties(self):
        self.tenant.expiry_date = None
        self.assertTrue(self.tenant.is_subscription_active)
        self.assertFalse(self.tenant.is_grace_period)
        self.tenant.update_subscription_status()
        self.assertEqual(self.tenant.subscription_status, 'ACTIVE')
        
        today = datetime.date.today()
        # Active
        self.tenant.expiry_date = today + datetime.timedelta(days=5)
        self.assertTrue(self.tenant.is_subscription_active)
        self.assertFalse(self.tenant.is_grace_period)
        self.tenant.update_subscription_status()
        self.assertEqual(self.tenant.subscription_status, 'ACTIVE')
        
        # Grace Period / Expired
        self.tenant.expiry_date = today - datetime.timedelta(days=2)
        self.assertFalse(self.tenant.is_subscription_active)
        self.assertTrue(self.tenant.is_grace_period)
        self.tenant.update_subscription_status()
        self.assertEqual(self.tenant.subscription_status, 'EXPIRED')
        
        # Suspended
        self.tenant.expiry_date = today - datetime.timedelta(days=20) # Given default grace is 14
        self.assertFalse(self.tenant.is_subscription_active)
        self.assertFalse(self.tenant.is_grace_period)
        self.tenant.update_subscription_status()
        self.assertEqual(self.tenant.subscription_status, 'SUSPENDED')

    def test_employee_creation_quota_exceeded(self):
        """Test QUOTA_EXCEEDED response when creating employee via API."""
        self.tenant.max_employees = 1
        self.tenant.save()
        
        # 1 employee already exists due to setUp maybe? Let's add 1.
        Employee.objects.create(email="one@test.com", fullname="One", nik="001", join_date="2024-01-01")
        
        url = reverse('employee-list')
        data = {
            'email': 'two@test.com',
            'fullname': 'Two',
            'nik': '002',
            'ktp_number': '123'
        }
        res = self.client.post(url, data, format='json', SERVER_NAME=self.tenant.domains.first().domain)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(res.data['code'], 'QUOTA_EXCEEDED')

    def test_employee_creation_exception_handling(self):
        """Test exception edge case by forcing an IntegrityError without proper fields."""
        url = reverse('employee-list')
        data = {
            'email': 'bad@test.com',
            'fullname': 'Bad',
            'ktp_number': '123',
            'nik': 'badly_formed',
            'join_date': '2024-01-01',
            'create_user': True
        }
        
        # By missing required parameters not caught by serializer or causing DB error downstream
        from unittest.mock import patch
        with patch('core.serializers.EmployeeSerializer.save', side_effect=Exception("DB Error boom")):
            res = self.client.post(url, data, format='json', SERVER_NAME=self.tenant.domains.first().domain)
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("DB Error boom", res.data['error'])
