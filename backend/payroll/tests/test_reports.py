import pytest
from django.urls import reverse
from core.tests.base import HRMSTestCase as TenantTestCase
from django_tenants.utils import schema_context
from rest_framework import status
from rest_framework.test import APIClient
from core.models import Employee, Department
from payroll.models import PayrollPeriod, Payslip
from users.models import User
from datetime import date

@pytest.mark.django_db
class PayrollReportingTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        
        with schema_context(self.tenant.schema_name):
            self.dept = Department.objects.create(name='Payroll Dept')
            self.user = User.objects.create_user(email='payroll_mgr@example.com', password='password', is_staff=True)
            self.user.tenants.add(self.tenant)
            
            self.employee = Employee.objects.create(
                fullname='Payroll Employee',
                email='payroll_mgr@example.com',
                department=self.dept,
                nik='P001',
                join_date=date.today(),
                ktp_number='P12345'
            )
            
            self.period = PayrollPeriod.objects.create(
                month=1,
                year=2026,
                start_date=date(2026, 1, 1),
                end_date=date(2026, 1, 31)
            )
            
            self.payslip = Payslip.objects.create(
                employee=self.employee,
                period=self.period,
                basic_salary=10000000,
                net_pay=10000000
            )
            
            self.domain_name = self.tenant.domains.first().domain

    def test_payroll_export_recap_csv(self):
        """Verify the payroll recap export action."""
        self.client.force_login(self.user)
        url = reverse('payslip-export-recap-csv')
        params = {'period_id': self.period.id}
        
        response = self.client.get(url, params, SERVER_NAME=self.domain_name)
        assert response.status_code == status.HTTP_200_OK
        assert response['Content-Type'] == 'text/csv'
        assert f'payroll_recap_{self.period.id}.csv' in response['Content-Disposition']
        
        content = response.content.decode('utf-8')
        assert 'Employee Name,NIK,Basic Salary,Allowance,Overtime,Deductions,Net Pay' in content
        assert 'Payroll Employee,P001,10000000' in content
