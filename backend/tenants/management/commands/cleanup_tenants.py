from django.core.management.base import BaseCommand
from tenants.models import Tenant
from django.utils import timezone
from datetime import timedelta

class Command(BaseCommand):
    help = 'Wipes data of tenants that have been suspended for more than the grace/retention period.'

    def add_arguments(self, parser):
        parser.add_argument('--retention-days', type=int, default=90, help='Days a tenant stays suspended before deletion')
        parser.add_argument('--dry-run', action='store_true', help='Show what would be deleted without actually deleting')

    def handle(self, *args, **options):
        retention_days = options['retention_days']
        dry_run = options['dry_run']
        
        threshold_date = timezone.now().date() - timedelta(days=retention_days)
        
        # We look for tenants that are SUSPENDED and their expiry_date + grace_period + retention_days has passed
        # Simplification: check if expiry_date + grace_period is older than threshold_date
        # (Assuming grace_period is already passed if they are SUSPENDED)
        
        from django_tenants.utils import get_public_schema_name
        tenants_to_delete = Tenant.objects.filter(
            subscription_status='SUSPENDED',
            expiry_date__lt=threshold_date
        ).exclude(schema_name=get_public_schema_name())

        if not tenants_to_delete.exists():
            self.stdout.write("No tenants found for cleanup.")
            return

        self.stdout.write(f"Found {tenants_to_delete.count()} tenants eligible for permanent deletion (Suspended > {retention_days} days).")

        for tenant in tenants_to_delete:
            if dry_run:
                self.stdout.write(f"[DRY-RUN] Would delete tenant: {tenant.name} (Schema: {tenant.schema_name})")
            else:
                self.stdout.write(f"Deleting tenant: {tenant.name}...")
                tenant.delete() # django-tenants handles schema deletion
                self.stdout.write(self.style.SUCCESS(f"Successfully deleted {tenant.name}."))

        if dry_run:
            self.stdout.write("Dry run completed. No data was modified.")
        else:
            self.stdout.write(self.style.SUCCESS("Cleanup completed."))
