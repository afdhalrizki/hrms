from django.test import Client
from django_tenants.test.cases import TenantTestCase
from django_tenants.utils import schema_context
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.urls import reverse
from core.models import Employee, Department
from tenants.models import Tenant, Domain
from reimbursement.models import Reimbursement, ReimbursementCategory

User = get_user_model()

class ReimbursementTestCase(TenantTestCase):
    def setUp(self):
        try:
            super().setUp()
            self.client = Client()
            
            # Ensure 'reimbursement' module is enabled and domain exists
            # In some versions of TenantTestCase, self.tenant is already created.
            from tenants.models import Domain
            if not Domain.objects.filter(tenant=self.tenant).exists():
                Domain.objects.create(domain='test.localhost', tenant=self.tenant, is_primary=True)
            
            self.tenant.plan_type = 'PROFESSIONAL'
            self.tenant.enabled_modules = ['core', 'reimbursement']
            self.tenant.save()
        except Exception as e:
            print(f"SETUP ERROR: {e}")
            raise e
        
        with schema_context(self.tenant.schema_name):
            self.dept = Department.objects.create(name='IT')
            
            # 1. Create Supervisor
            self.supervisor_user = User.objects.create_user(email='boss@test.com', password='password')
            self.supervisor_emp = Employee.objects.create(
                fullname='The Boss', email='boss@test.com', nik='BOSS01', 
                department=self.dept, ktp_number='12345', join_date='2020-01-01'
            )
            self.supervisor_user.tenants.add(self.tenant)
            
            # 2. Create Employee
            self.emp_user = User.objects.create_user(email='staff@test.com', password='password')
            self.emp = Employee.objects.create(
                fullname='The Staff', email='staff@test.com', nik='STAFF01', 
                department=self.dept, supervisor=self.supervisor_emp,
                ktp_number='67890', join_date='2021-01-01'
            )
            self.emp_user.tenants.add(self.tenant)
            
            # 3. Create Category
            self.cat = ReimbursementCategory.objects.create(name='Transport', max_amount=1000000)

    def test_reimbursement_workflow(self):
        """Test full workflow: Submit -> Supervisor Approve -> Finance Approve."""
        with schema_context(self.tenant.schema_name):
            # 1. Staff submits claim
            self.client.force_login(self.emp_user)
            url = reverse('reimbursement-list')
            host = Domain.objects.filter(tenant=self.tenant).first().domain
            
            data = {
                'category': self.cat.id,
                'date': '2026-03-18',
                'amount': 150000,
                'description': 'Taxi to client'
            }
            response = self.client.post(url, data, HTTP_HOST=host)
            if response.status_code != 201:
                print(f"Status Code: {response.status_code}")
                print(f"Response Content: {response.content}")
            self.assertEqual(response.status_code, 201)
            reimb_id = response.json()['id']
            
            # 2. Supervisor approves
            self.client.force_login(self.supervisor_user)
            approve_url = reverse('reimbursement-approve-supervisor', args=[reimb_id])
            response = self.client.post(approve_url, HTTP_HOST=host)
            self.assertEqual(response.status_code, 200)
            
            reimb = Reimbursement.objects.get(id=reimb_id)
            self.assertEqual(reimb.supervisor_status, 'APPROVED')
            self.assertEqual(reimb.status, 'PENDING') # Still pending finance
            
            # 3. Finance (Admin) approves
            # Force staff/superuser status for finance test
            self.supervisor_user.is_staff = True
            self.supervisor_user.save()
            
            approve_finance_url = reverse('reimbursement-approve-finance', args=[reimb_id])
            response = self.client.post(approve_finance_url, {'approved_amount': 140000}, HTTP_HOST=host)
            self.assertEqual(response.status_code, 200)
            
            reimb.refresh_from_db()
            self.assertEqual(reimb.finance_status, 'APPROVED')
            self.assertEqual(reimb.status, 'APPROVED')
            self.assertEqual(float(reimb.approved_amount), 140000)

    def test_reimbursement_isolation(self):
        """Staff should not see other's reimbursements."""
        host = Domain.objects.filter(tenant=self.tenant).first().domain
        with schema_context(self.tenant.schema_name):
            # Create a claim for supervisor
            Reimbursement.objects.create(
                employee=self.supervisor_emp, category=self.cat, 
                date='2026-01-01', amount=500, description='Boss expense'
            )
            
            # Login as staff
            self.client.force_login(self.emp_user)
            response = self.client.get(reverse('reimbursement-list'), HTTP_HOST=host)
            self.assertEqual(len(response.json()), 0) # Only sees own (none yet)
            
            # Submit one for staff
            Reimbursement.objects.create(
                employee=self.emp, category=self.cat, 
                date='2026-01-02', amount=100, description='Staff expense'
            )
            response = self.client.get(reverse('reimbursement-list'), HTTP_HOST=host)
            self.assertEqual(len(response.json()), 1)
