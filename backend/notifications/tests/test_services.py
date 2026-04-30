from django.test import override_settings
from unittest.mock import patch
from users.models import User
from notifications.services import NotificationService
from notifications.models import SystemNotification
from core.tests.base import HRMSTestCase

class NotificationServiceTestCase(HRMSTestCase):
    def setUp(self):
        super().setUp()
        # Create a test user with notifications enabled by default
        self.user = User.objects.create_user(
            email='employee@test.com', 
            password='password'
        )
        self.service = NotificationService()

    @patch('notifications.services.send_notification_email_task.delay')
    def test_email_sent_when_toggle_enabled(self, mock_delay):
        """Verify Celery task is called when receive_email_notifications is True."""
        self.assertTrue(self.user.receive_email_notifications)
        
        # Trigger notification
        self.service.send_employee_notification(
            target_user=self.user,
            title='Test Title',
            message='Test Message'
        )
        
        # Verify in-app notification created
        self.assertEqual(SystemNotification.objects.count(), 1)
        
        # Verify Celery email task called
        mock_delay.assert_called_once_with('employee@test.com', 'Test Title', 'Test Message')

    @patch('notifications.services.send_notification_email_task.delay')
    def test_email_blocked_when_toggle_disabled(self, mock_delay):
        """Verify Celery task is NOT called when receive_email_notifications is False."""
        # Disable notifications for this user
        self.user.receive_email_notifications = False
        self.user.save()
        
        # Trigger notification
        self.service.send_employee_notification(
            target_user=self.user,
            title='Test Title 2',
            message='Test Message 2'
        )
        
        # Verify in-app notification still created
        self.assertEqual(SystemNotification.objects.count(), 1)
        
        # Verify Celery email task was NOT called
        mock_delay.assert_not_called()

    @override_settings(ENABLE_EMAIL_NOTIFICATIONS=False)
    @patch('notifications.services.send_notification_email_task.delay')
    def test_email_blocked_when_global_setting_disabled(self, mock_delay):
        """Verify Celery task is NOT called when global ENABLE_EMAIL_NOTIFICATIONS is False, even if user toggle is True."""
        self.assertTrue(self.user.receive_email_notifications)
        
        # Trigger notification
        self.service.send_employee_notification(
            target_user=self.user,
            title='Test Title 3',
            message='Test Message 3'
        )
        
        # Verify in-app notification created
        self.assertEqual(SystemNotification.objects.count(), 1)
        
        # Verify Celery email task was NOT called because of global override
        mock_delay.assert_not_called()
