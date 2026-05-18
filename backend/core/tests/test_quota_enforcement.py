from core.tests.base import HRMSTestCase as TenantTestCase
from django_tenants.utils import schema_context
from core.models import Employee, Department, Role, Grade
from django.core.exceptions import ValidationError
from decimal import Decimal
from datetime import date
from django.db import connection

class QuotaEnforcementTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        with schema_context(self.tenant.schema_name):
            self.dept = Department.objects.create(name="Dept")
            self.role = Role.objects.create(name="Role", department=self.dept)
            self.gol = Grade.objects.create(name="G1", base_salary=1000)

    def test_employee_quota_enforcement(self):
        """Verify that creating more employees than allowed raises ValidationError."""
        # Set quota to 1
        self.tenant.max_employees = 1
        self.tenant.employee_count = 0 
        self.tenant.save()
        
        # Ensure connection.tenant is updated if cached
        connection.tenant = self.tenant

        with schema_context(self.tenant.schema_name):
            # 1. Create first employee - should succeed
            Employee.objects.create(
                nik="E1", fullname="Emp 1", email="e1@test.com", 
                department=self.dept, role=self.role, grade=self.gol,
                join_date=date.today(), ktp_number="KTP-1"
            )
            
            # The count should be 1 now
            self.tenant.refresh_from_db()
            self.assertEqual(self.tenant.employee_count, 1)
            
            # 2. Create second employee - should fail
            with self.assertRaisesMessage(ValidationError, "Employee quota exceeded"):
                Employee.objects.create(
                    nik="E2", fullname="Emp 2", email="e2@test.com", 
                    department=self.dept, role=self.role, grade=self.gol,
                    join_date=date.today(), ktp_number="KTP-2"
                )

    def test_active_only_quota_enforcement(self):
        """Verify that terminated employees do not count against the capacity quota."""
        # 1. Set quota to 1
        self.tenant.max_employees = 1
        self.tenant.employee_count = 0
        self.tenant.save()
        connection.tenant = self.tenant

        with schema_context(self.tenant.schema_name):
            # Create first employee (Active) - should succeed
            emp1 = Employee.objects.create(
                nik="E1", fullname="Emp 1", email="e1@test.com", 
                department=self.dept, role=self.role, grade=self.gol,
                join_date=date.today(), ktp_number="KTP-1", status="PERMANENT"
            )
            
            self.tenant.refresh_from_db()
            self.assertEqual(self.tenant.employee_count, 1)

            # Create second employee (TERMINATED) - should succeed despite quota being reached!
            emp2 = Employee.objects.create(
                nik="E2", fullname="Emp 2", email="e2@test.com", 
                department=self.dept, role=self.role, grade=self.gol,
                join_date=date.today(), ktp_number="KTP-2", status="TERMINATED"
            )
            
            # Count should still be 1 because TERMINATED doesn't increment the quota count!
            self.tenant.refresh_from_db()
            self.assertEqual(self.tenant.employee_count, 1)

            # Try to create a third employee (Active) - should fail because quota is 1 and filled by emp1
            with self.assertRaises(ValidationError):
                Employee.objects.create(
                    nik="E3", fullname="Emp 3", email="e3@test.com", 
                    department=self.dept, role=self.role, grade=self.gol,
                    join_date=date.today(), ktp_number="KTP-3", status="CONTRACT"
                )

            # Now, terminate emp1 (Active -> TERMINATED)
            emp1.status = "TERMINATED"
            emp1.save()

            # Quota count should decrement to 0!
            self.tenant.refresh_from_db()
            self.assertEqual(self.tenant.employee_count, 0)

            # Create a new active employee (Active) - should succeed now because seat is free!
            emp3 = Employee.objects.create(
                nik="E3", fullname="Emp 3", email="e3@test.com", 
                department=self.dept, role=self.role, grade=self.gol,
                join_date=date.today(), ktp_number="KTP-3", status="CONTRACT"
            )
            
            self.tenant.refresh_from_db()
            self.assertEqual(self.tenant.employee_count, 1)

            # Try to reactivate emp1 (TERMINATED -> Active) - should fail because quota is filled by emp3!
            emp1.status = "PERMANENT"
            with self.assertRaises(ValidationError):
                emp1.save()

    def test_email_sync_signals(self):
        """Verify that updates to employee emails sync to users, and vice-versa."""
        from users.models import User
        
        # 1. Create User
        with schema_context('public'):
            user, created = User.objects.get_or_create(
                email=f"sync_{self.worker_id}@test.com", 
                defaults={'first_name': "Sync User"}
            )
            if not user.tenants.filter(id=self.tenant.id).exists():
                user.tenants.add(self.tenant)

        with schema_context(self.tenant.schema_name):
            # Create Employee with same email
            emp = Employee.objects.create(
                nik="ESync", fullname="Sync User", email=user.email,
                department=self.dept, role=self.role, grade=self.gol,
                join_date=date.today(), ktp_number="KTP-SYNC", status="PERMANENT"
            )

            # Update Employee email
            emp.email = f"sync_new_{self.worker_id}@test.com"
            emp.save()

            # Check that User email was updated in public schema
            with schema_context('public'):
                user.refresh_from_db()
                self.assertEqual(user.email, f"sync_new_{self.worker_id}@test.com")

            # Update User email from public
            with schema_context('public'):
                user.email = f"sync_user_new_{self.worker_id}@test.com"
                user.save()

            # Check that Employee email was updated in tenant schema
            emp.refresh_from_db()
            self.assertEqual(emp.email, f"sync_user_new_{self.worker_id}@test.com")

    def test_cross_tenant_active_email_check(self):
        """Verify that an active employee's email cannot be used to create/update an active employee in another tenant."""
        from tenants.models import Tenant, Domain
        
        # Create a second tenant for testing cross-tenant checks (worker isolated)
        with schema_context('public'):
            tenant_b = Tenant.objects.filter(schema_name=f"tenant_b_{self.worker_id}").first()
            if not tenant_b:
                tenant_b = Tenant.objects.create(
                    schema_name=f"tenant_b_{self.worker_id}",
                    name=f"Perusahaan B {self.worker_id}",
                    plan_type="ESSENTIAL"
                )
            Domain.objects.get_or_create(
                domain=f"tenant-b-{self.worker_id}.local",
                defaults={'tenant': tenant_b, 'is_primary': True}
            )

        with schema_context(self.tenant.schema_name):
            # Create active employee in first tenant
            Employee.objects.create(
                nik="E_A1", fullname="Emp A1", email=f"cross_{self.worker_id}@test.com",
                department=self.dept, role=self.role, grade=self.gol,
                join_date=date.today(), ktp_number="KTP-A1", status="PERMANENT"
            )

        # Now, try to create active employee in tenant_b with same email
        with schema_context(tenant_b.schema_name):
            # First, we need foundational roles/departments in tenant_b to avoid FK errors
            from core.services import RoleService
            RoleService.initialize_default_roles()
            dept_b = Department.objects.create(name="Dept B")
            role_b = Role.objects.create(name="Role B", department=dept_b)
            gol_b = Grade.objects.create(name="G1_B", base_salary=1000)

            # Try to create active employee in tenant_b - should raise ValidationError!
            with self.assertRaisesMessage(ValidationError, "masih terdaftar/aktif di perusahaan"):
                Employee.objects.create(
                    nik="E_B1", fullname="Emp B1", email=f"cross_{self.worker_id}@test.com",
                    department=dept_b, role=role_b, grade=gol_b,
                    join_date=date.today(), ktp_number="KTP-B1", status="PERMANENT"
                )

            # Try to create TERMINATED employee in tenant_b - should succeed!
            emp_b_terminated = Employee.objects.create(
                nik="E_B1", fullname="Emp B1", email=f"cross_{self.worker_id}@test.com",
                department=dept_b, role=role_b, grade=gol_b,
                join_date=date.today(), ktp_number="KTP-B1", status="TERMINATED"
            )
            self.assertEqual(emp_b_terminated.status, "TERMINATED")
