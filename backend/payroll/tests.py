from decimal import Decimal
from django_tenants.test.cases import TenantTestCase
from django_tenants.utils import schema_context
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from core.models import Employee, Department, Role, Golongan
from .models import PayrollPeriod, Payslip, SalaryComponent
from .services import PayrollCalculator, BPJSManager, TaxEngine

class PayrollExtendedTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.dept = Department.objects.create(name="Engineering")
        self.role = Role.objects.create(name="Backend DEV", department=self.dept)
        self.gol = Golongan.objects.create(
            name="G3",
            base_salary=Decimal('15000000'),
            meal_allowance=Decimal('500000'),
            transport_allowance=Decimal('300000')
        )
        self.employee = Employee.objects.create(
            nik="EMP001",
            fullname="Afdhal Backend",
            email="afdhal@comp.com",
            department=self.dept,
            role=self.role,
            golongan=self.gol,
            join_date="2024-01-01",
            ktp_number="123456789",
            ptkp_status='K/1' # Category B
        )
        self.period = PayrollPeriod.objects.create(
            month=3, year=2026,
            start_date="2026-03-01", end_date="2026-03-31"
        )
        
        # Public User
        self.user = Employee.objects.create(
            nik="ADMIN", fullname="Admin", email="admin@tenant.com",
            department=self.dept, role=self.role, golongan=self.gol,
            join_date="2024-01-01", ktp_number="000"
        )
        # Note: In real setup, User model is separate, but for smoke tests on payroll logic 
        # we focus on the calculation. For API tests we need a real user.
        from users.models import User
        self.api_user = User.objects.create_user(email='admin@tenant.com', password='password', is_staff=True)

    def test_bpjs_ketenagakerjaan_calculation(self):
        """Verify JKK, JKM, JHT, and JP (capped) portions."""
        # Wage 15m (above JP cap of ~10m)
        wage = Decimal('15000000')
        res = BPJSManager.calculate_employment(wage)
        
        # JKK (0.24% company)
        self.assertEqual(res['jkk']['company'], Decimal('36000'))
        # JKM (0.3% company)
        self.assertEqual(res['jkm']['company'], Decimal('45000'))
        # JHT (3.7% comp, 2% ee)
        self.assertEqual(res['jht']['company'], Decimal('555000'))
        self.assertEqual(res['jht']['employee'], Decimal('300000'))
        # JP (2% comp, 1% ee - Capped at 10,042,300)
        self.assertEqual(res['jp']['company'], Decimal('200846')) # 10,042,300 * 0.02
        self.assertEqual(res['jp']['employee'], Decimal('100423')) # 10,042,300 * 0.01

    def test_tax_engine_categories(self):
        """Verify TER rate lookups for different categories."""
        # Cat A (TK/0)
        self.assertEqual(TaxEngine.get_ter_rate('A', Decimal('6000000')), Decimal('0.0075'))
        # Cat B (K/1)
        self.assertEqual(TaxEngine.get_ter_rate('B', Decimal('10000000')), Decimal('0.015'))
        # Cat C (K/3)
        self.assertEqual(TaxEngine.get_ter_rate('C', Decimal('10000000')), Decimal('0.01'))

    def test_payroll_calculator_run(self):
        """Verify full integration of calculations into Payslip model."""
        calc = PayrollCalculator(self.employee, self.period)
        payslip = calc.run()
        
        # 15,000,000 Gross
        # EE Deductions: 
        # Health: 120,000 (Capped at 12m)
        # JHT: 300,000 (2% of 15m)
        # JP: 100,423 (1% of 10.04m)
        # Tax (Cat B, 1.5% of 15m): 225,000
        # Total Deductions: 745,423
        # Net: 14,254,577
        
        self.assertEqual(payslip.net_pay, Decimal('14254577'))
        self.assertEqual(payslip.pph21_tax, Decimal('225000'))
        
    def test_api_generate_payslips(self):
        """Verify API bulk generation."""
        self.client.force_authenticate(user=self.api_user)
        url = reverse('payslip-generate')
        data = {
            'period_id': self.period.id,
            'employee_ids': [self.employee.id]
        }
        response = self.client.post(url, data, format='json', SERVER_NAME=self.tenant.domains.first().domain)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Payslip.objects.count(), 1)

    def test_api_download_pdf(self):
        """Verify PDF response content type."""
        calc = PayrollCalculator(self.employee, self.period)
        payslip = calc.run()
        
        self.client.force_authenticate(user=self.api_user)
        url = reverse('payslip-download-pdf', kwargs={'pk': payslip.id})
        response = self.client.get(url, SERVER_NAME=self.tenant.domains.first().domain)
        
        # This will likely fail currently due to bugs in pdf_generator.py (missing fields)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')
