from django.test import SimpleTestCase
from django.core import mail
from django.conf import settings
from unittest.mock import patch
from notifications.tasks import send_notification_email_task
from tenants.tasks import send_registration_email_task, send_welcome_email_task

class EmailContentTestCase(SimpleTestCase):
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
