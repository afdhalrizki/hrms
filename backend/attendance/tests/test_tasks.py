from datetime import date, time, timedelta
from decimal import Decimal
from django_tenants.utils import schema_context
from core.models import Employee, Department, Branch
from attendance.models import Attendance, Shift, Schedule, LeaveRequest
from attendance.tasks import check_absences_for_all_tenants
from core.tests.base import HRMSTestCase as TenantTestCase

class AttendanceTasksTestCase(TenantTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        # 1. Setup Branch
        cls.branch = Branch.objects.create(
            name='Jakarta Office',
            latitude=Decimal('-6.2088'),
            longitude=Decimal('106.8456'),
            radius_meters=100
        )
        cls.dept = Department.objects.create(name='Ops')
        cls.shift = Shift.objects.create(
            name='Morning Shift',
            start_time=time(8, 0),
            end_time=time(17, 0)
        )
        
        # 2. Create Active Employee
        cls.employee = Employee.objects.create(
            fullname='Active Worker',
            email='active_worker@example.com',
            department=cls.dept,
            branch=cls.branch,
            phone='12345',
            nik='K100',
            join_date=date.today(),
            ktp_number='1234567890',
            status='PROBATION'
        )

        cls.today = date.today()

    def setUp(self):
        super().setUp()
        self.tenant.refresh_from_db()
        self.employee.refresh_from_db()

    def test_mark_absent_for_missing_attendance(self):
        """Task should mark active worker with schedule as ABSENT if no clock-in exists."""
        with schema_context(self.tenant.schema_name):
            # Create schedule for tomorrow
            tomorrow = self.today + timedelta(days=1)
            Schedule.objects.create(
                employee=self.employee,
                shift=self.shift,
                date=tomorrow
            )
            
            # Run task
            res = check_absences_for_all_tenants(tomorrow.strftime('%Y-%m-%d'))
            
            # Verify Attendance record was created as ABSENT
            att = Attendance.objects.filter(employee=self.employee, date=tomorrow).first()
            self.assertIsNotNone(att)
            self.assertEqual(att.status, 'ABSENT')
            self.assertIn("Marked 1 records as ABSENT", res)

    def test_no_absent_if_attendance_exists(self):
        """Task should skip marking ABSENT if attendance already exists."""
        with schema_context(self.tenant.schema_name):
            test_date = self.today + timedelta(days=2)
            Schedule.objects.create(
                employee=self.employee,
                shift=self.shift,
                date=test_date
            )
            # Create a check-in record
            Attendance.objects.create(
                employee=self.employee,
                date=test_date,
                check_in=time(8, 0),
                status='PRESENT'
            )
            
            # Run task
            check_absences_for_all_tenants(test_date.strftime('%Y-%m-%d'))
            
            # Verify status is still PRESENT (not marked ABSENT)
            att = Attendance.objects.get(employee=self.employee, date=test_date)
            self.assertEqual(att.status, 'PRESENT')

    def test_no_absent_if_on_approved_leave(self):
        """Task should skip marking ABSENT if employee has an APPROVED leave request."""
        with schema_context(self.tenant.schema_name):
            test_date = self.today + timedelta(days=3)
            Schedule.objects.create(
                employee=self.employee,
                shift=self.shift,
                date=test_date
            )
            # Create approved leave
            LeaveRequest.objects.create(
                employee=self.employee,
                start_date=test_date,
                end_date=test_date,
                leave_type='SAKIT',
                status='APPROVED'
            )
            
            # Run task
            check_absences_for_all_tenants(test_date.strftime('%Y-%m-%d'))
            
            # Verify no attendance record is created
            att_exists = Attendance.objects.filter(employee=self.employee, date=test_date).exists()
            self.assertFalse(att_exists)

    def test_no_absent_if_no_schedule(self):
        """Task should skip employees who are not scheduled to work on that day."""
        with schema_context(self.tenant.schema_name):
            test_date = self.today + timedelta(days=4)
            # Do NOT create schedule
            
            # Run task
            check_absences_for_all_tenants(test_date.strftime('%Y-%m-%d'))
            
            # Verify no attendance record is created
            att_exists = Attendance.objects.filter(employee=self.employee, date=test_date).exists()
            self.assertFalse(att_exists)

    def test_no_absent_for_inactive_employees(self):
        """Task should skip terminated or resigned employees."""
        with schema_context(self.tenant.schema_name):
            test_date = self.today + timedelta(days=5)
            # Create inactive employee
            inactive_emp = Employee.objects.create(
                fullname='Inactive Worker',
                email='inactive@example.com',
                department=self.dept,
                branch=self.branch,
                nik='K200',
                join_date=date.today(),
                ktp_number='0987654321',
                status='TERMINATED'
            )
            # Schedule them
            Schedule.objects.create(
                employee=inactive_emp,
                shift=self.shift,
                date=test_date
            )
            
            # Run task
            check_absences_for_all_tenants(test_date.strftime('%Y-%m-%d'))
            
            # Verify no attendance record is created for inactive employee
            att_exists = Attendance.objects.filter(employee=inactive_emp, date=test_date).exists()
            self.assertFalse(att_exists)
