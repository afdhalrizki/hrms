from core.tests.base import HRMSTestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from core.models import Employee, Department, AccessRole, Branch, Role, Grade
from attendance.models import Attendance, LeaveRequest
from payroll.models import Payslip, PayrollPeriod
from users.models import User
from decimal import Decimal

class DashboardStatsTestCase(HRMSTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        # self.domain is provided by HRMSTestCase

        # 1. Setup primary admin for this test first to satisfy "last admin" constraint during cleanup
        self.user_admin = User.objects.get_or_create(email='admin@dashboard.com', defaults={'is_staff': True})[0]
        if not self.user_admin.pk: self.user_admin.save() 
        self.user_admin.tenants.add(self.tenant)

        # 2. Clear any leftover data
        Employee.objects.all().delete()
        Attendance.objects.all().delete()
        LeaveRequest.objects.all().delete()
        Payslip.objects.all().delete()
        # Remove extra users from this tenant
        for u in User.objects.filter(tenants=self.tenant).exclude(pk=self.user_admin.pk):
            u.tenants.remove(self.tenant)

        # 1. Setup Roles and Permissions
        self.admin_role = AccessRole.objects.create(
            name="Admin",
            permissions={'tenant_manage_hr': True, 'tenant_manage_settings': True}
        )
        self.staff_role = AccessRole.objects.create(
            name="Staff",
            permissions={'tenant_manage_hr': False}
        )

        # 3. Setup Users (staff)
        self.user_staff = User.objects.get_or_create(email='staff@dashboard.com', defaults={'is_staff': False})[0]
        if not self.user_staff.pk: self.user_staff.save()
        self.user_staff.tenants.add(self.tenant)

        # 3. Setup Base HR Data
        self.dept_it = Department.objects.create(name="IT")
        self.dept_hr = Department.objects.create(name="HR")
        
        # Branch needs lat/lng
        self.branch = Branch.objects.create(
            name="HQ",
            latitude=Decimal("-6.200000"),
            longitude=Decimal("106.816666")
        )
        self.role = Role.objects.create(name="Manager", department=self.dept_it)
        self.gol = Grade.objects.create(name="G1", base_salary=10000000)

        # 4. Create Employees
        self.emp_admin = Employee.objects.create(
            nik="ADMIN-01",
            fullname="Admin Employee",
            email=self.user_admin.email,
            department=self.dept_hr,
            role=self.role,
            grade=self.gol,
            access_role=self.admin_role,
            join_date=timezone.localdate(),
            ktp_number="1234567890123456"
        )
        
        self.emp_staff = Employee.objects.create(
            nik="STAFF-01",
            fullname="Staff Employee",
            email=self.user_staff.email,
            department=self.dept_it,
            role=self.role,
            grade=self.gol,
            access_role=self.staff_role,
            join_date=timezone.localdate() - timezone.timedelta(days=40),
            ktp_number="9876543210987654"
        )

        # 5. Setup Attendance for Today
        Attendance.objects.create(
            employee=self.emp_admin,
            date=timezone.localdate(),
            status='PRESENT'
        )

        # 6. Setup Pending Requests
        LeaveRequest.objects.create(
            employee=self.emp_staff,
            leave_type='CUTI',
            start_date=timezone.localdate() + timezone.timedelta(days=1),
            end_date=timezone.localdate() + timezone.timedelta(days=2),
            reason="Holiday",
            status='PENDING'
        )
        LeaveRequest.objects.create(
            employee=self.emp_admin,
            leave_type='SAKIT',
            start_date=timezone.localdate() + timezone.timedelta(days=5),
            end_date=timezone.localdate() + timezone.timedelta(days=6),
            reason="Fever",
            status='APPROVED'
        )

        # 7. Setup Payroll for Current Month
        today = timezone.localdate()
        self.period = PayrollPeriod.objects.create(
            month=today.month,
            year=today.year,
            start_date=today.replace(day=1),
            end_date=today.replace(day=28)
        )
        
        Payslip.objects.create(
            employee=self.emp_admin,
            period=self.period,
            net_pay=Decimal('10000000.00'),
            overtime_pay=Decimal('500000.00'),
            payment_date=today
        )
        Payslip.objects.create(
            employee=self.emp_staff,
            period=self.period,
            net_pay=Decimal('8000000.00'),
            overtime_pay=Decimal('0.00'),
            payment_date=None
        )

    def test_dashboard_stats_aggregation(self):
        """Verify that dashboard stats correctly aggregate data from various modules."""
        self.client.force_authenticate(user=self.user_admin)
        url = reverse('dashboard-stats')
        
        response = self.client.get(url, SERVER_NAME=self.domain, secure=True)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data
        
        # 1. Headcount
        self.assertEqual(data['total_employees'], 2)
        
        # 2. Attendance
        attendance_today = {item['status']: item['count'] for item in data['attendance_today']}
        self.assertEqual(attendance_today.get('PRESENT'), 1)
        self.assertEqual(data['attendance_percent'], 50.0)
        
        # 3. Pending Requests
        self.assertEqual(data['pending_leaves'], 1)
        
        # 4. New Hires
        self.assertEqual(data['new_hires'], 1)
        
        # 5. Payroll Summary
        self.assertEqual(Decimal(str(data['payroll_summary']['total_net_pay'])), Decimal('10000000.00'))
        self.assertEqual(Decimal(str(data['payroll_summary']['total_overtime'])), Decimal('500000.00'))
        
        # 6. Dept Distribution
        dept_dist = {item['name']: item['employee_count'] for item in data['department_distribution']}
        self.assertEqual(dept_dist.get('IT'), 1)
        self.assertEqual(dept_dist.get('HR'), 1)

    def test_dashboard_stats_permission(self):
        """Verify that only users with tenant_manage_hr permission can access dashboard stats."""
        self.client.force_authenticate(user=self.user_staff)
        url = reverse('dashboard-stats')
        response = self.client.get(url, SERVER_NAME=self.domain, secure=True)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        self.client.force_authenticate(user=self.user_admin)
        response = self.client.get(url, SERVER_NAME=self.domain, secure=True)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
