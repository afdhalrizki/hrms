from unittest.mock import patch
from django.core.management import call_command
from core.tests.base import HRMSTestCase as TenantTestCase
from users.models import User

class NotifyAdminUrlTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        # Create a Superadmin
        self.superadmin = User.objects.create_user(
            email='superadmin_notify@platform.com',
            password='password123',
            is_active=True,
            global_role='SUPERADMIN',
            receive_email_notifications=True
        )
        
        # Create a Support Agent
        self.support_agent = User.objects.create_user(
            email='support_notify@platform.com',
            password='password123',
            is_active=True,
            global_role='SUPPORT_AGENT',
            receive_email_notifications=True
        )
        
        # Create a regular user (should NOT receive email)
        self.regular_user = User.objects.create_user(
            email='regular_notify@tenant.com',
            password='password123',
            is_active=True,
            global_role=None,
            receive_email_notifications=True
        )

    @patch('users.management.commands.notify_admin_url.send_mail')
    @patch.dict('os.environ', {'ADMIN_URL': 'portal-admin-test-xyz/'})
    def test_notify_admin_url_command(self, mock_send_mail):
        """Verify that notify_admin_url command queries the correct roles and sends email."""
        # Execute the management command
        call_command('notify_admin_url')
        
        # Verify send_mail was called
        self.assertTrue(mock_send_mail.called)
        
        # Extract call args
        args, kwargs = mock_send_mail.call_args
        
        # Check subject
        self.assertIn('[SECURITY] URL Portal Admin Baru', kwargs['subject'])
        
        # Check recipients (Superadmin and Support Agent must be present)
        recipient_list = kwargs['recipient_list']
        self.assertIn('superadmin_notify@platform.com', recipient_list)
        self.assertIn('support_notify@platform.com', recipient_list)
        
        # Regular user must NOT be in recipient list
        self.assertNotIn('regular_notify@tenant.com', recipient_list)
        
        # Check email message body content contains the ADMIN_URL env var
        message = kwargs['message']
        self.assertIn('portal-admin-test-xyz/', message)
