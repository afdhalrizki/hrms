from django.test import TestCase
from django.core import mail
from django.conf import settings
from unittest.mock import patch
from notifications.tasks import send_notification_email_task
from tenants.tasks import send_registration_email_task, send_welcome_email_task

class EmailContentTestCase(TestCase):
    """
    Test suite to verify branding 'HariKerja HRMS' in all automatic emails.
    """

    def test_settings_default_from_email(self):
        """Verify that DEFAULT_FROM_EMAIL has the correct display name."""
        self.assertIn("HariKerja HRMS", settings.DEFAULT_FROM_EMAIL)
        self.assertTrue(settings.DEFAULT_FROM_EMAIL.startswith("HariKerja HRMS <"))

    @patch('notifications.tasks.send_mail')
    def test_notification_email_content(self, mock_send_mail):
        """Verify signature in general notification emails."""
        email = "test@example.com"
        title = "Test Notification"
        message = "Testing message content"
        
        send_notification_email_task(email, title, message)
        
        # Check send_mail was called
        self.assertTrue(mock_send_mail.called)
        
        # Extract arguments
        args, kwargs = mock_send_mail.call_args
        sent_message = kwargs.get('message') or args[1]
        from_email = kwargs.get('from_email') or args[2]
        
        # Verify branding
        self.assertIn("HariKerja HRMS", from_email)
        self.assertIn("Terima kasih,\nHariKerja HRMS", sent_message)
        self.assertIn("Halo,", sent_message)

    @patch('tenants.tasks.send_mail')
    def test_registration_received_email_content(self, mock_send_mail):
        """Verify Indonesian content and signature in registration email."""
        admin_email = "newadmin@tenant.com"
        
        send_registration_email_task(admin_email)
        
        self.assertTrue(mock_send_mail.called)
        args, kwargs = mock_send_mail.call_args
        sent_message = kwargs.get('message') or args[1]
        
        # Verify Indonesian translation and signature
        self.assertIn("Pendaftaran Anda telah kami terima", sent_message)
        self.assertIn("Terima kasih,\nHariKerja HRMS", sent_message)

    @patch('tenants.tasks.send_mail')
    def test_registration_received_admin_notification(self, mock_send_mail):
        """Verify that an email notification is sent to custom recipient list with tenant details."""
        from tenants.models import GlobalSetting
        GlobalSetting.objects.create(
            key='registration_notification_emails',
            value='harikerja.hrms@gmail.com'
        )
        
        admin_email = "newadmin@tenant.com"
        company_name = "Super Corp"
        subdomain_prefix = "supercorp"
        
        send_registration_email_task(admin_email, company_name=company_name, subdomain_prefix=subdomain_prefix)
        
        # Two emails should have been sent (one to registering admin, one to harikerja.hrms@gmail.com)
        self.assertEqual(mock_send_mail.call_count, 2)
        
        # Verify first call (registrant email)
        first_args, first_kwargs = mock_send_mail.call_args_list[0]
        first_recipient = first_kwargs.get('recipient_list') or first_args[3]
        self.assertEqual(first_recipient, [admin_email])
        
        # Verify second call (admin notification email)
        second_args, second_kwargs = mock_send_mail.call_args_list[1]
        second_subject = second_kwargs.get('subject') or second_args[0]
        second_message = second_kwargs.get('message') or second_args[1]
        second_recipient = second_kwargs.get('recipient_list') or second_args[3]
        
        self.assertIn("harikerja.hrms@gmail.com", second_recipient)
        self.assertIn("Super Corp", second_subject)
        self.assertIn("Terdapat pendaftaran user/tenant baru", second_message)
        self.assertIn("Nama Tenant: Super Corp", second_message)
        self.assertIn("Subdomain: supercorp", second_message)
        self.assertIn("Email Admin: newadmin@tenant.com", second_message)

    @patch('tenants.tasks.send_mail')
    def test_registration_received_admin_notification_fallback(self, mock_send_mail):
        """Verify that notification falls back to global admins if no custom setting is set."""
        from users.models import User
        # Create a global admin user
        User.objects.create_user(
            email='admin@master.com',
            password='password123',
            global_role='SUPERADMIN',
            is_active=True
        )
        
        admin_email = "newadmin@tenant.com"
        company_name = "Super Corp"
        subdomain_prefix = "supercorp"
        
        send_registration_email_task(admin_email, company_name=company_name, subdomain_prefix=subdomain_prefix)
        
        self.assertEqual(mock_send_mail.call_count, 2)
        
        # Verify second call goes to the global admin email
        second_args, second_kwargs = mock_send_mail.call_args_list[1]
        second_recipient = second_kwargs.get('recipient_list') or second_args[3]
        self.assertIn("admin@master.com", second_recipient)

    @patch('tenants.tasks.send_mail')
    def test_welcome_email_content(self, mock_send_mail):
        """Verify credentials and signature in welcome email."""
        admin_email = "boss@company.com"
        domain = "company.harikerja.com"
        
        send_welcome_email_task(admin_email, domain)
        
        self.assertTrue(mock_send_mail.called)
        args, kwargs = mock_send_mail.call_args
        sent_message = kwargs.get('message') or args[1]
        
        # Verify branding and instructions
        self.assertIn(domain, sent_message)
        self.assertIn("Workspace Anda", sent_message)
        self.assertIn("Terima kasih,\nHariKerja HRMS", sent_message)
        self.assertIn("change-me-123", sent_message)

    @patch('notifications.tasks.send_mail')
    def test_employee_onboarding_email_content(self, mock_send_mail):
        """Verify onboarding email for new employees."""
        email = "newhire@company.com"
        name = "Budi Doremi"
        domain = "company.harikerja.com"
        
        from notifications.tasks import send_employee_onboarding_email_task
        send_employee_onboarding_email_task(email, name, domain)
        
        self.assertTrue(mock_send_mail.called)
        args, kwargs = mock_send_mail.call_args
        sent_message = kwargs.get('message') or args[1]
        
        # Verify branding and instructions
        self.assertIn(name, sent_message)
        self.assertIn(domain, sent_message)
        self.assertIn("Selamat bergabung", sent_message)
        self.assertIn("HariKerja HRMS", sent_message)
