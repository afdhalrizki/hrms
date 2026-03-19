from decimal import Decimal
from django_tenants.test.cases import TenantTestCase
from django_tenants.utils import schema_context
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from core.models import Employee, Department, Role, Golongan
from .models import PayrollPeriod, Payslip, SalaryComponent, PayslipDetail
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
        """Verify JKK, JKM, JHT, and JP (capped) portions with custom tenant risk."""
        self.tenant.jkk_rate = Decimal('0.0174') # High risk example
        self.tenant.save()
        
        # Wage 15m (above JP cap of ~10m)
        wage = Decimal('15000000')
        res = BPJSManager.calculate_employment(wage, jkk_rate=self.tenant.jkk_rate)
        
        # JKK (1.74% company)
        self.assertEqual(res['jkk']['company'], Decimal('261000'))
        # JKM (0.3% company)
        self.assertEqual(res['jkm']['company'], Decimal('45000'))
        # JHT (3.7% comp, 2% ee)
        self.assertEqual(res['jht']['company'], Decimal('555000'))
        self.assertEqual(res['jht']['employee'], Decimal('300000'))
        # JP (2% comp, 1% ee - Capped at 10,042,300)
        self.assertEqual(res['jp']['company'], Decimal('200846')) # 10,042,300 * 0.02
        self.assertEqual(res['jp']['employee'], Decimal('100423')) # 10,042,300 * 0.01

    def test_tax_engine_categories(self):
        """Verify TER rate lookups for different categories per PMK 168/2023."""
        # Cat A (TK/0) @ 6m -> 0.75%
        self.assertEqual(TaxEngine.get_ter_rate('A', Decimal('6000000')), Decimal('0.0075'))
        # Cat B (K/1) @ 10m -> 1.75%
        self.assertEqual(TaxEngine.get_ter_rate('B', Decimal('10000000')), Decimal('0.0175'))
        # Cat C (K/3) @ 10m -> 1.5%
        self.assertEqual(TaxEngine.get_ter_rate('C', Decimal('10000000')), Decimal('0.015'))

    def test_payroll_calculator_run(self):
        """Verify full integration of calculations into Payslip model."""
        calc = PayrollCalculator(self.employee, self.period)
        payslip = calc.run()
        
        # 15,000,000 Gross
        # EE Deductions: 
        # Health: 120,000 (Capped at 12m)
        # JHT: 300,000 (2% of 15m)
        # JP: 100,423 (1% of 10.04m)
        # Tax (Cat B, 3% of 15m per new table): 450,000
        # Total Deductions: 970,423
        # Net: 14,029,577
        
        self.assertEqual(payslip.net_pay, Decimal('14029577'))
        self.assertEqual(payslip.pph21_tax, Decimal('450000'))
        
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
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')

    def test_overtime_precedence_logic(self):
        """Verify precedence: Golongan Rate > Tenant Rate > Divisor."""
        from attendance.models import Overtime
        Overtime.objects.create(
            employee=self.employee, date="2026-03-05", hours=10, status='APPROVED'
        )
        
        # 1. Fallback to Divisor (15,000,000 / 173 * 10 = 867,052)
        calc = PayrollCalculator(self.employee, self.period)
        payslip = calc.run()
        self.assertEqual(payslip.overtime_pay, Decimal('867052'))
        payslip.delete()
        
        # 2. Tenant Rate (100,000 * 10 = 1,000,000)
        self.tenant.overtime_rate = Decimal('100000')
        self.tenant.save()
        
        # Explicitly update connection.tenant to ensure Calculator sees it
        from django.db import connection
        connection.tenant = self.tenant
        
        calc = PayrollCalculator(self.employee, self.period)
        payslip = calc.run()
        self.assertEqual(payslip.overtime_pay, Decimal('1000000'))
        payslip.delete()
        
        # 3. Golongan Rate (200,000 * 10 = 2,000,000)
        self.gol.overtime_rate = 200000
        self.gol.save()
        calc = PayrollCalculator(self.employee, self.period)
        payslip = calc.run()
        self.assertEqual(payslip.overtime_pay, Decimal('2000000'))
        
    def test_reimbursement_integration(self):
        """Verify approved reimbursements are added to gross pay."""
        from reimbursement.models import Reimbursement, ReimbursementCategory
        cat = ReimbursementCategory.objects.create(name="Business Trip")
        Reimbursement.objects.create(
            employee=self.employee, category=cat, date="2026-03-10", 
            amount=500000, approved_amount=450000, status='APPROVED'
        )
        
        calc = PayrollCalculator(self.employee, self.period)
        payslip = calc.run()
        
        # Gross = Basic(15m) + Overtime(0) + Reimbursement(450k) = 15,450,000
        # Tax engine will use this Gross.
        # But for net pay, we check if details include reimbursement
        details = PayslipDetail.objects.filter(payslip=payslip, description__icontains='Reimbursement')
        self.assertTrue(details.exists())
        self.assertEqual(details.first().amount, Decimal('450000'))

    def test_bpjs_wage_caps(self):
        """Verify ceiling for Health (12m) and Employment JP (10.04m)."""
        # Huge salary to trigger all caps
        self.gol.base_salary = Decimal('50000000')
        self.gol.save()
        
        calc = PayrollCalculator(self.employee, self.period)
        payslip = calc.run()
        
        # Health 1% of 12m = 120,000
        # JHT 2% of 50m = 1,000,000 (No cap)
        # JP 1% of 10.04m = 100,423
        
        health_detail = PayslipDetail.objects.get(payslip=payslip, description__icontains='Kesehatan')
        self.assertEqual(health_detail.amount, Decimal('120000'))
        
        jp_detail = PayslipDetail.objects.get(payslip=payslip, description__icontains='BPJS JP')
        self.assertEqual(jp_detail.amount, Decimal('100423'))

    def test_payslip_self_service_filter(self):
        """Standard employees should only see their own payslips."""
        # Create another employee and their payslip
        emp2 = Employee.objects.create(
            nik="EMP002", fullname="User Two", email="user2@comp.com",
            department=self.dept, role=self.role, golongan=self.gol, join_date="2024-01-01"
        )
        calc = PayrollCalculator(emp2, self.period)
        calc.run()
        
        calc1 = PayrollCalculator(self.employee, self.period)
        calc1.run()
        
        # Authenticate as emp2 (standard user)
        from users.models import User
        user2 = User.objects.create_user(email='user2@comp.com', password='password')
        self.client.force_authenticate(user=user2)
        
        url = reverse('payslip-list')
        response = self.client.get(url, SERVER_NAME=self.tenant.domains.first().domain)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should only see 1 payslip (their own)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['employee_name'], "User Two")

    def test_payslip_duplicate_prevention(self):
        """Unique constraint (employee, period) should prevent duplicates."""
        calc = PayrollCalculator(self.employee, self.period)
        calc.run()
        
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            calc.run()
