from core.tests.base import HRMSTestCase as TenantTestCase
from django_tenants.utils import schema_context
from core.models import Employee, Department, Role, Golongan
from users.models import User
from attendance.models import LeaveRequest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from decimal import Decimal
from datetime import date

class DeepIsolationTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        # Clear leftovers from other tests in the same worker
        Employee.objects.all().delete()
        # Tenant A (self.tenant) is already setup by TenantTestCase
        
        # Create a second tenant for isolation testing
        from tenants.models import Tenant, Domain
        with schema_context('public'):
            self.tenant_b = Tenant.objects.create(schema_name='tenant_b', name='Tenant B')
            Domain.objects.create(domain='tenantb.localhost', tenant=self.tenant_b, is_primary=True)
        
        with schema_context(self.tenant.schema_name):
            # Setup User/Employee in Tenant A
            self.dept_a = Department.objects.create(name="A Dept")
            self.role_a = Role.objects.create(name="A Role", department=self.dept_a)
            self.gol_a = Golongan.objects.create(name="G_A", base_salary=1000)
            self.emp_a = Employee.objects.create(
                nik="EMP-A", fullname="User A", email="a@test.com", 
                department=self.dept_a, role=self.role_a, golongan=self.gol_a,
                join_date=date.today(), ktp_number="KTP-A"
            )

        with schema_context(self.tenant_b.schema_name):
            # Setup User/Employee in Tenant B
            self.dept_b = Department.objects.create(name="B Dept")
            self.role_b = Role.objects.create(name="B Role", department=self.dept_b)
            self.gol_b = Golongan.objects.create(name="G_B", base_salary=2000)
            self.emp_b = Employee.objects.create(
                nik="EMP-B", fullname="User B", email="b@test.com", 
                department=self.dept_b, role=self.role_b, golongan=self.gol_b,
                join_date=date.today(), ktp_number="KTP-B"
            )
            
            # Create a Leave Request in Tenant B
            self.leave_b = LeaveRequest.objects.create(
                employee=self.emp_b,
                leave_type='SICK',
                start_date=date.today(),
                end_date=date.today(),
                reason="Feeling sick in B"
            )

    def test_cross_tenant_idor_protection(self):
        """
        Verify that Tenant A cannot access or modify LeaveRequest ID belonging to Tenant B.
        """
        # 1. Internal check: The ID should not exist in Tenant A's schema
        with schema_context(self.tenant.schema_name):
            exists_in_a = LeaveRequest.objects.filter(id=self.leave_b.id).exists()
            self.assertFalse(exists_in_a, "Tenant B's record should not be visible in Tenant A's schema context.")
            
        # 2. API level check: Ensure 404 is returned for cross-tenant IDs
        with schema_context(self.tenant.schema_name):
            # Create a user for Tenant A (using the email of the seeded employee)
            user_a = User.objects.create_user(email="a@test.com", password="password123")
            user_a.tenants.add(self.tenant)
            
            self.client.force_authenticate(user=user_a)
            
            # Try to fetch Tenant B's leave request (ID 1 in B, but 404 in A)
            url = reverse('leaverequest-detail', kwargs={'pk': self.leave_b.id})
            response = self.client.get(url)
            
            # Should be 404 because the ID doesn't exist in Tenant A's schema
            self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_schema_isolation_at_database_level(self):
        """
        Directly verify that querying one schema returns different results than another.
        """
        with schema_context(self.tenant.schema_name):
            self.assertEqual(Employee.objects.count(), 1)
            self.assertEqual(Employee.objects.first().fullname, "User A")
            
        with schema_context(self.tenant_b.schema_name):
            self.assertEqual(Employee.objects.count(), 1)
            self.assertEqual(Employee.objects.first().fullname, "User B")
            
    def tearDown(self):
        # Cleanup Tenant B
        from django_tenants.utils import schema_context
        with schema_context('public'):
            if hasattr(self, 'tenant_b'):
                self.tenant_b.delete()
        super().tearDown()
