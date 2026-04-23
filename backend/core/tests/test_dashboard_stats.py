from django_tenants.test.cases import FastTenantTestCase as TenantTestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from core.models import Employee, Department, AccessRole, Branch, Role, Golongan
from attendance.models import Attendance, LeaveRequest
from payroll.models import Payslip, PayrollPeriod
from users.models import User
from decimal import Decimal

class DashboardStatsTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.domain = self.tenant.domains.first().domain

        # 1. Setup Roles and Permissions
        self.admin_role = AccessRole.objects.create(
            name="Admin",
            permissions={'manage_hr': True, 'manage_settings': True}
        )
        self.staff_role = AccessRole.objects.create(
            name="Staff",
            permissions={'manage_hr': False}
        )

        # 2. Setup Users
        self.user_admin = User.objects.create_user(email='admin@dashboard.com', password='password')
        self.user_admin.tenants.add(self.tenant)
        
        self.user_staff = User.objects.create_user(email='staff@dashboard.com', password='password')
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
        self.gol = Golongan.objects.create(name="G1", base_salary=10000000)

        # 4. Create Employees
        self.emp_admin = Employee.objects.create(
            nik="ADMIN-01",
            fullname="Admin Employee",
            email=self.user_admin.email,
            department=self.dept_hr,
            role=self.role,
            golongan=self.gol,
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
            golongan=self.gol,
            access_role=self.staff_role,
            join_date=timezone.localdate() - timezone.timedelta(days=40), # Not a new hire
            ktp_number="9876543210987654"
        )

        # 5. Setup Attendance for Today
        Attendance.objects.create(
            employee=self.emp_admin,
            date=timezone.localdate(),
            status='PRESENT'
        )
        # emp_staff is absent (not created)

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
            status='APPROVED' # Should NOT be counted as pending
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
            payment_date=today # Paid
        )
        Payslip.objects.create(
            employee=self.emp_staff,
            period=self.period,
            net_pay=Decimal('8000000.00'),
            overtime_pay=Decimal('0.00'),
            payment_date=None # Not paid yet, should NOT be counted in totals
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
        # 1 present out of 2 total = 50%
        self.assertEqual(data['attendance_percent'], 50.0)
        
        # 3. Pending Requests
        self.assertEqual(data['pending_leaves'], 1)
        
        # 4. New Hires (join_date within last 30 days)
        # Admin joined today, Staff joined 40 days ago
        self.assertEqual(data['new_hires'], 1)
        
        # 5. Payroll Summary (Only paid ones)
        # Only emp_admin's 10M is paid
        self.assertEqual(Decimal(str(data['payroll_summary']['total_net_pay'])), Decimal('10000000.00'))
        self.assertEqual(Decimal(str(data['payroll_summary']['total_overtime'])), Decimal('500000.00'))
        
        # 6. Dept Distribution
        # IT: 1 (emp_staff), HR: 1 (emp_admin)
        dept_dist = {item['name']: item['employee_count'] for item in data['department_distribution']}
        self.assertEqual(dept_dist.get('IT'), 1)
        self.assertEqual(dept_dist.get('HR'), 1)

    def test_dashboard_stats_permission(self):
        """Verify that only users with manage_hr permission can access dashboard stats."""
        # 1. Staff (no manage_hr) -> 403
        self.client.force_authenticate(user=self.user_staff)
        url = reverse('dashboard-stats')
        response = self.client.get(url, SERVER_NAME=self.domain, secure=True)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # 2. Admin (with manage_hr) -> 200
        self.client.force_authenticate(user=self.user_admin)
        response = self.client.get(url, SERVER_NAME=self.domain, secure=True)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
