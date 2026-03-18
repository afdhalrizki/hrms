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
        Logic to send emails or in-app notifications based on status change.
        """
        if status == 'EXPIRED':
            self.stdout.write(f"  - Notification: Sending 'Expired (Grace Period)' alert to {tenant.name}")
        elif status == 'SUSPENDED':
            self.stdout.write(f"  - Notification: Sending 'Suspended' lockout alert to {tenant.name}")
