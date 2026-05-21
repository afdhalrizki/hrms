from django_tenants.utils import schema_context
from django.urls import reverse
from rest_framework import status
from users.models import User
from core.models import Department, Role, Grade, Employee, InternalTicket, InternalTicketMessage
from tenants.models import PlatformTicket, PlatformTicketMessage
from core.tests.base import HRMSTestCase

class SupportTicketingTestCase(HRMSTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        with schema_context('public'):
            from tenants.models import Tenant
            Tenant.objects.get_or_create(schema_name='public', defaults={'name': 'HariKerja Platform'})
            
        # Create standard Employee
        cls.employee_user = User.objects.create_user(email='employee@tenant.com', password='password')
        cls.employee_user.tenants.add(cls.tenant)
        
        # Create HR Admin User
        cls.hr_user = User.objects.create_user(email='hr@tenant.com', password='password', is_staff=True)
        cls.hr_user.tenants.add(cls.tenant)
        
        # Create Another Employee
        cls.other_employee_user = User.objects.create_user(email='other@tenant.com', password='password')
        cls.other_employee_user.tenants.add(cls.tenant)
        
        # Create Global Support Agent (Public Schema User)
        cls.global_support_user = User.objects.create_user(email='support@platform.com', password='password', global_role='SUPPORT_AGENT')

    def setUp(self):
        super().setUp()
        from django.db import connection
        connection.set_tenant(self.tenant)
        
        # Set up HR master records inside tenant schema
        with schema_context(self.tenant.schema_name):
            dept = Department.objects.create(name="HR")
            role = Role.objects.create(name="Staff", department=dept)
            grade = Grade.objects.create(name="G1", base_salary=5000000)
            
            # Create Employee profiles linked to the users
            self.employee = Employee.objects.create(
                email=self.employee_user.email, nik='EMP001', fullname='Standard Employee',
                department=dept, role=role, grade=grade, join_date='2026-01-01', ktp_number='KTP001'
            )
            self.hr_employee = Employee.objects.create(
                email=self.hr_user.email, nik='EMP002', fullname='HR Admin',
                department=dept, role=role, grade=grade, join_date='2026-01-01', ktp_number='KTP002'
            )
            self.other_employee = Employee.objects.create(
                email=self.other_employee_user.email, nik='EMP003', fullname='Other Employee',
                department=dept, role=role, grade=grade, join_date='2026-01-01', ktp_number='KTP003'
            )

    def test_internal_ticket_lifecycle(self):
        # 1. Employee creates a ticket
        self.client.force_login(self.employee_user)
        url = reverse('internal-tickets-list')
        payload = {
            'title': 'Payroll issue',
            'description': 'My salary was not fully transferred.',
            'category': 'PAYROLL',
            'priority': 'HIGH'
        }
        response = self.client.post(url, payload, format='json', SERVER_NAME=str(self.domain))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        ticket_id = response.data['id']
        self.assertEqual(response.data['status'], 'OPEN')
        self.assertEqual(response.data['creator_name'], 'Standard Employee')

        # 2. Other employee should not see the ticket in their list
        self.client.force_login(self.other_employee_user)
        response = self.client.get(url, SERVER_NAME=str(self.domain))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should not include employee's ticket
        self.assertEqual(len(response.data), 0)

        # 3. Employee adds a reply message
        self.client.force_login(self.employee_user)
        message_url = reverse('internal-tickets-add-message', kwargs={'pk': ticket_id})
        response = self.client.post(message_url, {'message': 'Please help check ASAP.'}, format='json', SERVER_NAME=str(self.domain))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # 4. Employee tries to post an internal note (should fail)
        response = self.client.post(message_url, {'message': 'Private HR note.', 'is_internal': True}, format='json', SERVER_NAME=str(self.domain))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # 5. HR lists tickets (should see all tickets)
        self.client.force_login(self.hr_user)
        response = self.client.get(url, SERVER_NAME=str(self.domain))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

        # 6. HR adds internal message & response (moves status to IN_PROGRESS)
        response = self.client.post(message_url, {'message': 'Internal HR investigation note.', 'is_internal': True}, format='json', SERVER_NAME=str(self.domain))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        response = self.client.post(message_url, {'message': 'We are looking into this.', 'is_internal': False}, format='json', SERVER_NAME=str(self.domain))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify status is now IN_PROGRESS
        detail_url = reverse('internal-tickets-detail', kwargs={'pk': ticket_id})
        response = self.client.get(detail_url, SERVER_NAME=str(self.domain))
        self.assertEqual(response.data['status'], 'IN_PROGRESS')

        # 7. Employee checks detail (should NOT see the internal note, only the public replies)
        self.client.force_login(self.employee_user)
        response = self.client.get(detail_url, SERVER_NAME=str(self.domain))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should see: description (implied message) + 2 public messages (reply + HR public answer)
        # Internal HR note should not be in response.data['messages']
        messages = response.data['messages']
        self.assertEqual(len(messages), 2)
        for msg in messages:
            self.assertFalse(msg['is_internal'])

        # 8. HR resolves ticket
        self.client.force_login(self.hr_user)
        resolve_url = reverse('internal-tickets-resolve', kwargs={'pk': ticket_id})
        response = self.client.post(resolve_url, SERVER_NAME=str(self.domain))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify status is RESOLVED
        response = self.client.get(detail_url, SERVER_NAME=str(self.domain))
        self.assertEqual(response.data['status'], 'RESOLVED')

    def test_platform_ticket_lifecycle(self):
        # 1. Tenant Admin (HR User in our setup, since they are is_staff=True) creates a platform ticket
        self.client.force_login(self.hr_user)
        url = reverse('platform-tickets-list')
        payload = {
            'title': 'Application is slow',
            'description': 'The attendance page takes 10 seconds to load.',
            'category': 'BUG',
            'priority': 'MEDIUM'
        }
        response = self.client.post(url, payload, format='json', HTTP_X_TENANT=self.tenant.schema_name)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        ticket_id = response.data['id']
        self.assertEqual(response.data['status'], 'OPEN')
        self.assertEqual(response.data['creator_email'], self.hr_user.email)

        # 2. Standard Employee cannot see or access platform tickets
        self.client.force_login(self.employee_user)
        response = self.client.get(url, HTTP_X_TENANT=self.tenant.schema_name)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 3. Global Support logs in and assigns ticket to themselves
        self.client.force_login(self.global_support_user)
        assign_url = reverse('platform-tickets-assign', kwargs={'pk': ticket_id})
        response = self.client.post(assign_url, HTTP_X_TENANT='public')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # 4. Global Support replies
        msg_url = reverse('platform-tickets-add-message', kwargs={'pk': ticket_id})
        response = self.client.post(msg_url, {'message': 'We are looking into the database queries.'}, format='json', HTTP_X_TENANT='public')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # 5. Check detail from tenant admin side
        self.client.force_login(self.hr_user)
        detail_url = reverse('platform-tickets-detail', kwargs={'pk': ticket_id})
        response = self.client.get(detail_url, HTTP_X_TENANT=self.tenant.schema_name)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'IN_PROGRESS')
        self.assertEqual(response.data['assigned_agent_name'], self.global_support_user.email)
        self.assertEqual(len(response.data['messages']), 1)

        # 6. Global Support marks ticket as resolved
        self.client.force_login(self.global_support_user)
        resolve_url = reverse('platform-tickets-resolve', kwargs={'pk': ticket_id})
        response = self.client.post(resolve_url, HTTP_X_TENANT='public')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify status is RESOLVED
        self.client.force_login(self.hr_user)
        response = self.client.get(detail_url, HTTP_X_TENANT=self.tenant.schema_name)
        self.assertEqual(response.data['status'], 'RESOLVED')

    def test_dynamic_guidelines(self):
        url = reverse('help-guidelines')

        # 1. Unauthenticated Request -> 401
        self.client.logout()
        response = self.client.get(url, HTTP_X_TENANT=self.tenant.schema_name)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # 2. Tenant User + Mobile
        self.client.force_login(self.employee_user)
        response = self.client.get(f"{url}?platform=mobile", HTTP_X_TENANT=self.tenant.schema_name)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['role'], 'tenant_user')
        self.assertEqual(response.data['platform'], 'mobile')
        self.assertTrue(any('Absensi' in g['title'] for g in response.data['guidelines']))

        # 3. Tenant User + Web
        response = self.client.get(f"{url}?platform=web", HTTP_X_TENANT=self.tenant.schema_name)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['role'], 'tenant_user')
        self.assertEqual(response.data['platform'], 'web')
        self.assertTrue(any('Slip Gaji' in g['title'] for g in response.data['guidelines']))

        # 4. Tenant Admin + Web
        self.client.force_login(self.hr_user)
        response = self.client.get(f"{url}?platform=web", HTTP_X_TENANT=self.tenant.schema_name)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['role'], 'tenant_admin')
        self.assertEqual(response.data['platform'], 'web')
        self.assertTrue(any('Payroll' in g['title'] for g in response.data['guidelines']))

        # 5. Tenant Admin + Mobile
        response = self.client.get(f"{url}?platform=mobile", HTTP_X_TENANT=self.tenant.schema_name)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['role'], 'tenant_admin')
        self.assertEqual(response.data['platform'], 'mobile')
        self.assertTrue(any('Quick Approvals' in g['title'] for g in response.data['guidelines']))

        # 6. Global Admin + Web
        self.client.force_login(self.global_support_user)
        response = self.client.get(f"{url}?platform=web", HTTP_X_TENANT='public')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['role'], 'global_admin')
        self.assertEqual(response.data['platform'], 'web')
        self.assertTrue(any('Tenant Baru' in g['title'] for g in response.data['guidelines']))

        # 7. Global Admin + Mobile
        response = self.client.get(f"{url}?platform=mobile", HTTP_X_TENANT='public')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['role'], 'global_admin')
        self.assertEqual(response.data['platform'], 'mobile')
        self.assertTrue(any('SaaS Seluler' in g['title'] for g in response.data['guidelines']))

