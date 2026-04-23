from decimal import Decimal
from django_tenants.test.cases import FastTenantTestCase as TenantTestCase
from django_tenants.utils import schema_context
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from core.models import Employee, Department, Golongan
from payroll.models import PayrollPeriod, Payslip
from users.models import User

class PayrollSubscriptionEnforcementTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.tenant.plan_type = 'PROFESSIONAL'
        self.tenant.enabled_modules = ['core', 'payroll']
        self.tenant.expiry_date = None
        self.tenant.save()

        with schema_context(self.tenant.schema_name):
            self.dept = Department.objects.create(name="Engineering")
            self.gol = Golongan.objects.create(name="G3", base_salary=Decimal('10000000'))
            self.employee = Employee.objects.create(
                nik="EMP001", fullname="Afdhal", email="afdhal@test.com",
                department=self.dept, golongan=self.gol, join_date="2024-01-01", ktp_number="123"
            )
            self.period = PayrollPeriod.objects.create(
                month=3, year=2026, start_date="2026-03-01", end_date="2026-03-31"
            )

        self.admin_user = User.objects.create_user(email='admin@test.com', password='password', is_staff=True)
        self.admin_user.tenants.add(self.tenant)
        self.domain = self.tenant.domains.first().domain

    def test_generate_payslips_blocked_when_subscription_expired(self):
        """Verify that payroll generation is blocked if subscription is expired (Read-Only)."""
        from datetime import date, timedelta
        # Set expiry date to yesterday to make is_subscription_active False (but still in grace period)
        self.tenant.expiry_date = date.today() - timedelta(days=1)
        self.tenant.save()

        self.client.force_authenticate(user=self.admin_user)
        url = reverse('payslip-generate')
        payload = {
            'period_id': self.period.id,
            'employee_ids': [self.employee.id]
        }
        response = self.client.post(url, payload, format='json', SERVER_NAME=self.domain, secure=True)
        
        self.assertEqual(response.status_code, status.HTTP_402_PAYMENT_REQUIRED)
        resp_data = response.json()
        self.assertEqual(resp_data['code'], 'SUBSCRIPTION_EXPIRED_READ_ONLY')
        self.assertFalse(Payslip.objects.filter(period=self.period).exists())

    def test_generate_payslips_blocked_when_subscription_suspended(self):
        """Verify that payroll generation is blocked if subscription is suspended (after grace period)."""
        from datetime import date, timedelta
        # Set expiry date to 20 days ago (grace period is 14 days)
        self.tenant.expiry_date = date.today() - timedelta(days=20)
        self.tenant.save()

        self.client.force_authenticate(user=self.admin_user)
        url = reverse('payslip-generate')
        payload = {
            'period_id': self.period.id,
            'employee_ids': [self.employee.id]
        }
        response = self.client.post(url, payload, format='json', SERVER_NAME=self.domain, secure=True)
        
        self.assertEqual(response.status_code, status.HTTP_402_PAYMENT_REQUIRED)
        resp_data = response.json()
        self.assertEqual(resp_data['code'], 'SUBSCRIPTION_SUSPENDED')
        self.assertFalse(Payslip.objects.filter(period=self.period).exists())

    def test_payslip_queryset_admin_filtering(self):
        """Verify that admins can filter payslips by various parameters."""
        with schema_context(self.tenant.schema_name):
            # Create a second period and payslip
            period2 = PayrollPeriod.objects.create(
                month=4, year=2026, start_date="2026-04-01", end_date="2026-04-30"
            )
            Payslip.objects.create(
                employee=self.employee, period=self.period, 
                basic_salary=1000, net_pay=900
            )
            Payslip.objects.create(
                employee=self.employee, period=period2, 
                basic_salary=1000, net_pay=900
            )

        self.client.force_authenticate(user=self.admin_user)
        url = reverse('payslip-list')

        # 1. Filter by period_id
        response = self.client.get(url, {'period_id': self.period.id}, SERVER_NAME=self.domain, secure=True)
        resp_data = response.json()
        self.assertEqual(len(resp_data), 1)
        self.assertEqual(resp_data[0]['period'], self.period.id)

        # 2. Filter by month/year
        response = self.client.get(url, {'period_month': 4, 'period_year': 2026}, SERVER_NAME=self.domain, secure=True)
        resp_data = response.json()
        self.assertEqual(len(resp_data), 1)
        self.assertEqual(resp_data[0]['period_name'], "Periode: 4/2026")
