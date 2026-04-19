import os
from django.core.management.base import BaseCommand
from django.core.files.storage import default_storage
from django_tenants.utils import schema_context
from tenants.models import Tenant
from core.models import Employee
from reimbursement.models import Reimbursement
from attendance.models import Attendance, LeaveRequest

class Command(BaseCommand):
    help = 'Migrate existing media files to tenant-specific folders'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simulate the migration without moving files or updating the database',
        )
        parser.add_argument(
            '--include-public',
            action='store_true',
            help='Include the public schema in the migration (moves files to public/ prefix)',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        include_public = options['include_public']

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN MODE: No files will be moved."))

        tenants = Tenant.objects.all()
        if not include_public:
            tenants = tenants.exclude(schema_name='public')

        for tenant in tenants:
            self.stdout.write(self.style.SUCCESS(f"\nProcessing Tenant: {tenant.schema_name}"))
            with schema_context(tenant.schema_name):
                self.migrate_model_files(Employee, ['ktp_image', 'npwp_image', 'face_reference'], tenant.schema_name, dry_run)
                self.migrate_model_files(Reimbursement, ['attachment'], tenant.schema_name, dry_run)
                self.migrate_model_files(Attendance, ['photo_in'], tenant.schema_name, dry_run)
                self.migrate_model_files(LeaveRequest, ['attachment'], tenant.schema_name, dry_run)

    def migrate_model_files(self, model, file_fields, schema_name, dry_run):
        instances = model.objects.all()
        count = 0
        
        for instance in instances:
            updated = False
            for field_name in file_fields:
                file_field = getattr(instance, field_name)
                if not file_field:
                    continue
                
                old_path = file_field.name
                # Check if it's already prefixed with schema_name/
                if old_path.startswith(f"{schema_name}/"):
                    continue
                
                new_path = f"{schema_name}/{old_path}"
                
                if default_storage.exists(old_path):
                    self.stdout.write(f"  [{model.__name__} {instance.pk}] Moving {old_path} -> {new_path}")
                    
                    if not dry_run:
                        try:
                            # Move the file
                            with default_storage.open(old_path) as f:
                                default_storage.save(new_path, f)
                            default_storage.delete(old_path)
                            
                            # Update DB field
                            setattr(instance, field_name, new_path)
                            updated = True
                        except Exception as e:
                            self.stdout.write(self.style.ERROR(f"    Error moving file: {e}"))
                else:
                    self.stdout.write(self.style.WARNING(f"  [{model.__name__} {instance.pk}] File not found at {old_path}, skipping..."))

            if updated and not dry_run:
                instance.save(update_fields=file_fields)
                count += 1

        if count > 0:
            self.stdout.write(self.style.SUCCESS(f"  Successfully migrated {count} {model.__name__} records."))
