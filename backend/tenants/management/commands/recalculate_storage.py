from django.core.management.base import BaseCommand
from django.db import connection
from django_tenants.utils import schema_context
from tenants.models import Tenant
from core.models import Employee
from core.storage_utils import get_instance_file_size
from reimbursement.models import Reimbursement
from attendance.models import Attendance, LeaveRequest

class Command(BaseCommand):
    help = 'Recalculates storage_used_bytes for one or all tenants based on actual database records.'

    def add_arguments(self, parser):
        parser.add_argument('--tenant', type=str, help='Specific tenant schema name to recalculate')

    def handle(self, *args, **options):
        tenant_name = options.get('tenant')
        
        if tenant_name:
            tenants = Tenant.objects.filter(schema_name=tenant_name)
        else:
            tenants = Tenant.objects.exclude(schema_name='public')

        for tenant in tenants:
            self.stdout.write(f"Processing tenant: {tenant.schema_name}...")
            total_bytes = 0
            
            with schema_context(tenant.schema_name):
                # Recalculate Storage
                for emp in Employee.objects.all():
                    total_bytes += get_instance_file_size(emp)
                for rem in Reimbursement.objects.all():
                    total_bytes += get_instance_file_size(rem)
                for att in Attendance.objects.all():
                    total_bytes += get_instance_file_size(att)
                for leave in LeaveRequest.objects.all():
                    total_bytes += get_instance_file_size(leave)
                
                # Recalculate Employees
                employee_count = Employee.objects.count()

            tenant.storage_used_bytes = total_bytes
            tenant.employee_count = employee_count
            tenant.save(update_fields=['storage_used_bytes', 'employee_count'])
            
            self.stdout.write(f"Finished {tenant.schema_name}. Storage: {total_bytes} bytes, Employees: {employee_count}.")
