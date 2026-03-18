import csv
import os
from django.core.management.base import BaseCommand
from django.apps import apps
from django.db import connection

class Command(BaseCommand):
    help = 'Exports all critical tenant data to a CSV for backup and portability.'

    def add_arguments(self, parser):
        parser.add_argument('--output-dir', type=str, help='Directory to save the exported files')

    def handle(self, *args, **options):
        tenant = connection.tenant
        self.stdout.write(f"Exporting data for tenant: {tenant.name} (Schema: {tenant.schema_name})")

        output_dir = options.get('output_dir') or f"exports/{tenant.schema_name}"
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        # List of models to export
        models_to_export = [
            ('core', 'Department'),
            ('core', 'Role'),
            ('core', 'Employee'),
            ('attendance', 'Attendance'),
            ('attendance', 'LeaveRequest'),
            ('attendance', 'Overtime'),
            ('payroll', 'SalaryComponent'),
            ('payroll', 'PayrollPeriod'),
            ('payroll', 'Payslip'),
        ]

        for app_label, model_name in models_to_export:
            try:
                model = apps.get_model(app_label, model_name)
                filename = os.path.join(output_dir, f"{app_label}_{model_name.lower()}.csv")
                
                with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
                    queryset = model.objects.all()
                    if not queryset.exists():
                        self.stdout.write(self.style.WARNING(f"No data for {app_label}.{model_name}, skipping..."))
                        continue

                    # Get field names
                    field_names = [field.name for field in model._meta.fields]
                    writer = csv.DictWriter(csvfile, fieldnames=field_names)
                    writer.writeheader()

                    for obj in queryset:
                        row = {}
                        for field in field_names:
                            val = getattr(obj, field)
                            # Handle foreign keys by using their IDs or __str__
                            if hasattr(val, 'id'):
                                row[field] = val.id
                            else:
                                row[field] = val
                        writer.writerow(row)

                self.stdout.write(self.style.SUCCESS(f"Exported {app_label}.{model_name} to {filename}"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed to export {app_label}.{model_name}: {str(e)}"))

        self.stdout.write(self.style.SUCCESS(f"Export completed. Files located in {output_dir}"))
