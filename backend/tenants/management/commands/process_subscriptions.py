from django.core.management.base import BaseCommand
from tenants.models import Tenant
from django.utils import timezone

class Command(BaseCommand):
    help = 'Processes all tenant subscriptions, updates statuses, and triggers notifications.'

    def handle(self, *args, **options):
        # This command should be run in the 'public' schema context
        tenants = Tenant.objects.exclude(schema_name='public')
        self.stdout.write(f"Processing {tenants.count()} tenant subscriptions...")

        for tenant in tenants:
            old_status = tenant.subscription_status
            tenant.update_subscription_status()
            new_status = tenant.subscription_status

            if old_status != new_status:
                self.stdout.write(self.style.SUCCESS(
                    f"Tenant {tenant.name}: {old_status} -> {new_status}"
                ))
                
                # Placeholder for notification logic
                self.send_notifications(tenant, new_status)
            else:
                self.stdout.write(f"Tenant {tenant.name}: Status remains {new_status}")

        self.stdout.write(self.style.SUCCESS("Subscription processing completed."))

    def send_notifications(self, tenant, status):
        """
        Logic to send emails and create in-app SystemNotification.
        """
        from core.models import SystemNotification
        from django_tenants.utils import schema_context
        
        with schema_context(tenant.schema_name):
            if status == 'EXPIRED':
                SystemNotification.objects.create(
                    title="Subscription Expired",
                    message="Your subscription has expired. The system is now in Read-Only mode. Please renew to continue full operations.",
                    level='WARNING'
                )
                self.stdout.write(f"  - Notification: Created 'Expired' alert for {tenant.name}")
                
            elif status == 'SUSPENDED':
                SystemNotification.objects.create(
                    title="Account Suspended",
                    message="Your account has been suspended due to non-payment. Access is restricted. Please contact support or renew immediately.",
                    level='CRITICAL'
                )
                self.stdout.write(f"  - Notification: Created 'Suspended' alert for {tenant.name}")
            
            elif status == 'ACTIVE':
                # Possibly a renewal notification
                SystemNotification.objects.create(
                    title="Subscription Active",
                    message="Thank you for your payment! Your subscription is now active.",
                    level='SUCCESS'
                )
