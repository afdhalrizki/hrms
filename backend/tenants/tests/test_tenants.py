from django.test import TestCase
from django.conf import settings
from django.db import IntegrityError
from tenants.models import Tenant, Domain

class TenantModelTestCase(TestCase):
    def test_tenant_creation(self):
        """Verify that a basic tenant can be created with a specific schema name."""
        tenant = Tenant.objects.create(
            schema_name='test_schema',
            name='Test Company'
        )
        self.assertEqual(tenant.schema_name, 'test_schema')
        self.assertEqual(tenant.name, 'Test Company')
        self.assertTrue(tenant.auto_create_schema)

    def test_tenant_branding_and_tiering_fields(self):
        """Verify that branding and tiering fields can be stored and retrieved."""
        tenant = Tenant.objects.create(
            schema_name='branding_test',
            name='Branding Inc',
            theme_primary_color='#FF0000',
            theme_secondary_color='#00FF00',
            enabled_modules=['core', 'attendance', 'payroll'],
            plan_type='PROFESSIONAL'
        )
        self.assertEqual(tenant.theme_primary_color, '#FF0000')
        self.assertEqual(tenant.theme_secondary_color, '#00FF00')
        self.assertEqual(tenant.enabled_modules, ['core', 'attendance', 'payroll'])
        self.assertEqual(tenant.plan_type, 'PROFESSIONAL')

    def test_domain_association(self):
        """Verify that a domain can be correctly linked to a tenant."""
        tenant = Tenant.objects.create(
            schema_name='client_a',
            name='Client A'
        )
        domain = Domain.objects.create(
            domain=f'client-a.{settings.TENANT_DOMAIN_SUFFIX}',
            tenant=tenant,
            is_primary=True
        )
        self.assertEqual(domain.domain, f'client-a.{settings.TENANT_DOMAIN_SUFFIX}')
        self.assertEqual(domain.tenant, tenant)
        self.assertTrue(domain.is_primary)

    def test_unique_schema_name(self):
        """Verify that two tenants cannot share the same schema name."""
        Tenant.objects.create(schema_name='duplicate', name='Company 1')
        with self.assertRaises(IntegrityError):
            Tenant.objects.create(schema_name='duplicate', name='Company 2')

    def test_unique_domain(self):
        """Verify that two tenants cannot share the same domain name."""
        t1 = Tenant.objects.create(schema_name='tenant1', name='Tenant 1')
        t2 = Tenant.objects.create(schema_name='tenant2', name='Tenant 2')
        
        Domain.objects.create(domain=f'shared.{settings.TENANT_DOMAIN_SUFFIX}', tenant=t1)
        with self.assertRaises(IntegrityError):
            Domain.objects.create(domain=f'shared.{settings.TENANT_DOMAIN_SUFFIX}', tenant=t2)

    def test_tenant_str_representation(self):
        """Verify the string representation of the Tenant model."""
        tenant = Tenant.objects.create(schema_name='hr_inc', name='HR Inc.')
        # TenantMixin usually doesn't define __str__ in a way that uses name, 
        # let's see if we should override it or if it defaults to schema_name.
        # By default TenantMixin uses schema_name.
        self.assertEqual(str(tenant), 'hr_inc')

    def test_domain_str_representation(self):
        """Verify the string representation of the Domain model."""
        tenant = Tenant.objects.create(schema_name='docs', name='Docs Corp')
        domain = Domain.objects.create(domain=f'docs.{settings.TENANT_DOMAIN_SUFFIX}', tenant=tenant)
        self.assertEqual(str(domain), f'docs.{settings.TENANT_DOMAIN_SUFFIX}')

from django_tenants.test.cases import TenantTestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.urls import reverse
from django.contrib.auth import get_user_model
from tenants.models import RegistrationRequest, Tenant, Domain
from core.models import Department, Role, Golongan, Employee
from django_tenants.utils import schema_context

User = get_user_model()

class RegistrationFlowTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        from django_tenants.utils import schema_context
        
        with schema_context('public'):
            # Ensure public tenant exists (TenantTestCase usually creates one tenant, 
            # but let's make sure we have localhost/testserver mapped to public)
            self.public_tenant, _ = Tenant.objects.get_or_create(
                schema_name='public',
                name='Public Schema'
            )
            Domain.objects.get_or_create(
                domain='localhost',
                tenant=self.public_tenant,
                is_primary=True
            )
            Domain.objects.get_or_create(
                domain='testserver',
                tenant=self.public_tenant,
                is_primary=False
            )

        self.signup_url = reverse('public-signup-list')
        self.approval_list_url = reverse('internal-registration-list')
        
        # Create an admin user for approval tests
        self.admin_user = User.objects.create_superuser(
            email='admin@master.com',
            password='password123',
            first_name='Master Admin'
        )
        self.client.force_authenticate(user=self.admin_user)

    def test_schema_access(self):
        """Verify that the API schema is accessible."""
        response = self.client.get('/api/schema/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_public_signup_creation(self):
        """Verify that any user can submit a registration request."""
        self.client.logout()  # Unauthenticated
        data = {
            'company_name': 'New Startup',
            'subdomain_prefix': 'startup',
            'admin_email': 'founder@startup.com'
        }
        response = self.client.post(self.signup_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(RegistrationRequest.objects.count(), 1)
        
        request = RegistrationRequest.objects.first()
        self.assertEqual(request.company_name, 'New Startup')
        self.assertEqual(request.status, 'PENDING')

    def test_admin_approval_process(self):
        """Verify that an admin can approve a request and trigger provisioning."""
        # 1. Create a pending request
        registration = RegistrationRequest.objects.create(
            company_name='Approved Corp',
            subdomain_prefix='approved',
            admin_email='admin@approved.com'
        )
        
        approve_url = reverse('internal-registration-approve', args=[registration.id])
        
        # 2. Approve it
        response = self.client.post(approve_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 3. Verify side effects
        # - Request status updated
        registration.refresh_from_db()
        self.assertEqual(registration.status, 'APPROVED')
        
        # - Tenant created
        tenant = Tenant.objects.get(schema_name='approved')
        self.assertEqual(tenant.name, 'Approved Corp')
        
        # - Domain created
        domain = Domain.objects.get(tenant=tenant)
        self.assertEqual(domain.domain, f'approved.{settings.TENANT_DOMAIN_SUFFIX}')
        
        # - Admin user created/provisioned
        new_admin = User.objects.get(email='admin@approved.com')
        self.assertTrue(new_admin.tenants.filter(id=tenant.id).exists())

        # - HR Master Data provisioned within the new schema
        with schema_context(tenant.schema_name):
            self.assertTrue(Department.objects.filter(name="Management").exists())
            self.assertTrue(Role.objects.filter(name="Company Admin").exists())
            self.assertTrue(Golongan.objects.filter(name="G1").exists())
            
            # - Admin linked as Employee
            self.assertTrue(Employee.objects.filter(
                email='admin@approved.com', 
                nik="ADMIN-001"
            ).exists())

    def test_admin_rejection_process(self):
        """Verify that an admin can reject a request."""
        registration = RegistrationRequest.objects.create(
            company_name='Rejected Inc',
            subdomain_prefix='rejected',
            admin_email='admin@rejected.com'
        )
        
        reject_url = reverse('internal-registration-reject', args=[registration.id])
        response = self.client.post(reject_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        registration.refresh_from_db()
        self.assertEqual(registration.status, 'REJECTED')
        
        # Verify no tenant was created
        self.assertFalse(Tenant.objects.filter(schema_name='rejected').exists())

    def test_unauthorized_approval(self):
        """Verify that non-admins cannot approve registrations."""
        self.client.logout()
        registration = RegistrationRequest.objects.create(
            company_name='Hackers',
            subdomain_prefix='hacked',
            admin_email='hacker@evil.com'
        )
        
        approve_url = reverse('internal-registration-approve', args=[registration.id])
        response = self.client.post(approve_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_registration_prefix_collision(self):
        """Verify that duplicate subdomain prefixes are rejected."""
        with schema_context('public'):
            Tenant.objects.create(schema_name='collision', name='Existing Tenant')
        
        data = {
            'company_name': 'New Startup',
            'subdomain_prefix': 'collision',
            'admin_email': 'founder@startup.com'
        }
        response = self.client.post(self.signup_url, data)
        # Should be blocked either by serializer validation or DB integrity handled by view
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_registration_duplicate_action_prevention(self):
        """Verify that already approved requests cannot be approved again."""
        registration = RegistrationRequest.objects.create(
            company_name='Double Approval',
            subdomain_prefix='double',
            admin_email='admin@double.com',
            status='APPROVED'
        )
        approve_url = reverse('internal-registration-approve', args=[registration.id])
        response = self.client.post(approve_url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Only pending requests', response.data['error'])

class TenantSettingsTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.domain_name = self.tenant.domains.first().domain
        self.settings_url = reverse('tenant-settings')
        
        # Admin User
        self.admin = User.objects.create_user(email='admin@settings.com', password='password', is_staff=True)
        self.admin.tenants.add(self.tenant)
        
        # Regular User
        self.regular = User.objects.create_user(email='user@settings.com', password='password')
        self.regular.tenants.add(self.tenant)

    def test_settings_retrieve_public(self):
        """Verify that settings can be retrieved without authentication (for logo/branding)."""
        # Ensure domain matches what middleware expects
        response = self.client.get(self.settings_url, HTTP_HOST=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], self.tenant.name)

    def test_settings_update_authorized(self):
        """Verify that a tenant admin can update settings."""
        self.client.force_login(self.admin)
        payload = {
            'address': 'New Headquarters, Tech Park',
            'phone': '08123456789',
            'overtime_rate': '150000.00',
            'theme_primary_color': '#0000FF',
            'enabled_modules': ['core', 'attendance', 'performance']
        }
        response = self.client.patch(self.settings_url, payload, format='json', HTTP_HOST=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.tenant.refresh_from_db()
        self.assertEqual(self.tenant.address, 'New Headquarters, Tech Park')
        self.assertEqual(self.tenant.overtime_rate, 150000)
        self.assertEqual(self.tenant.theme_primary_color, '#0000FF')
        self.assertEqual(self.tenant.enabled_modules, ['core', 'attendance', 'performance'])

    def test_settings_update_unauthorized(self):
        """Verify that regular employees are blocked from updating settings."""
        self.client.force_login(self.regular)
        payload = {'name': 'Hacker Corp'}
        response = self.client.patch(self.settings_url, payload, format='json', HTTP_HOST=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

class ProvisioningDepthTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.public_tenant, _ = Tenant.objects.get_or_create(schema_name='public', name='Public')
        Domain.objects.get_or_create(domain='localhost', tenant=self.public_tenant, is_primary=True)
        Domain.objects.get_or_create(domain='testserver', tenant=self.public_tenant, is_primary=False)
        
        self.admin = User.objects.create_superuser(email='master@platform.com', password='password123')
        self.client.force_authenticate(user=self.admin)

    def test_provisioning_accuracy(self):
        """Verify the deep provisioned state after registration approval via API."""
        registration = RegistrationRequest.objects.create(
            company_name='Depth Test',
            subdomain_prefix='depth',
            admin_email='depth@test.com'
        )
        
        url = reverse('internal-registration-approve', args=[registration.id])
        response = self.client.post(url)
        self.assertEqual(response.status_code, 200)
        
        # 2. Verify Schema State
        tenant = Tenant.objects.get(schema_name='depth')
        with schema_context(tenant.schema_name):
            # Roles
            from core.models import AccessRole
            self.assertTrue(AccessRole.objects.filter(name="Admin").exists())
            self.assertTrue(AccessRole.objects.filter(name="HR Manager").exists())
            self.assertTrue(AccessRole.objects.filter(name="Staff").exists())
            
            # Admin User Connection
            admin_user = User.objects.get(email='depth@test.com')
            self.assertTrue(admin_user.tenants.filter(id=tenant.id).exists())
            
            # Employee Linkage
            employee = Employee.objects.get(email='depth@test.com')
            self.assertEqual(employee.nik, "ADMIN-001")
            self.assertEqual(employee.access_role.name, "Admin")
            self.assertEqual(employee.status, 'PERMANENT')
