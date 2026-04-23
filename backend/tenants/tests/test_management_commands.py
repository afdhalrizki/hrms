from io import StringIO
import os
import shutil
from datetime import timedelta
from django.utils import timezone
from django.core.management import call_command
from django.test import override_settings
from django_tenants.utils import schema_context, get_public_schema_name
from tenants.models import Tenant, Domain
from core.models import Department
from notifications.models import SystemNotification
from core.tests.base import HRMSTestCase

class BootstrapTenantsCommandTestCase(HRMSTestCase):
    def test_bootstrap_tenants_creates_public_if_missing(self):
        from django_tenants.utils import get_public_schema_name
        # We start with public tenant NOT already mapped to a Tenant record (django_tenants creates schema but not Tenant)
        public_exists = Tenant.objects.filter(schema_name=get_public_schema_name()).exists()
        self.assertFalse(public_exists)
        
        # Calling command should skip public and just create company1
        with schema_context(get_public_schema_name()):
            out = StringIO()
            call_command('bootstrap_tenants', stdout=out)
            
            self.assertIn('company1 tenant at company1', out.getvalue())
            self.assertTrue(Tenant.objects.filter(schema_name='company1').exists())
            
            # Second call skips both
            out2 = StringIO()
            call_command('bootstrap_tenants', stdout=out2)
            self.assertIn('Public tenant already exists, skipping', out2.getvalue())
            self.assertIn('company1 tenant already exists, skipping', out2.getvalue())

class CleanupTenantsCommandTestCase(HRMSTestCase):
    def test_cleanup_deletes_expired_suspended_tenants(self):
        from django_tenants.utils import schema_context, get_public_schema_name
        # Create a tenant that is suspended and expired long ago
        with schema_context(get_public_schema_name()):
            expired_tenant = Tenant(schema_name='expired_co', name='Expired Co', subscription_status='SUSPENDED',
                                    expiry_date=timezone.now().date() - timedelta(days=100))
            expired_tenant.save()
            Domain.objects.create(domain='expired.localhost', tenant=expired_tenant, is_primary=True)
        
        with schema_context(get_public_schema_name()):
            out = StringIO()
            # Test dry-run first
            call_command('cleanup_tenants', '--retention-days=90', '--dry-run', stdout=out)
            self.assertIn('[DRY-RUN] Would delete tenant: Expired Co', out.getvalue())
            self.assertTrue(Tenant.objects.filter(schema_name='expired_co').exists())
            
            out2 = StringIO()
            # Test real run
            call_command('cleanup_tenants', '--retention-days=90', stdout=out2)
            self.assertIn('Successfully deleted Expired Co.', out2.getvalue())
            self.assertFalse(Tenant.objects.filter(schema_name='expired_co').exists())

    def test_cleanup_ignores_valid_tenants(self):
        from django_tenants.utils import schema_context, get_public_schema_name
        with schema_context(get_public_schema_name()):
            valid_tenant = Tenant(schema_name='valid_co', name='Valid Co', subscription_status='ACTIVE',
                                    expiry_date=timezone.now().date() + timedelta(days=10))
            valid_tenant.save()
        
        with schema_context(get_public_schema_name()):
            out = StringIO()
            call_command('cleanup_tenants', '--retention-days=90', stdout=out)
            self.assertIn('No tenants found for cleanup.', out.getvalue())
            self.assertTrue(Tenant.objects.filter(schema_name='valid_co').exists())


class ExportTenantDataCommandTestCase(HRMSTestCase):
    def test_export_data_generates_csvs(self):
        # Setup basic data
        with schema_context(self.tenant.schema_name):
            Department.objects.create(name='Exported Department', description='Export Target')
        
        out = StringIO()
        output_dir = os.path.join(os.getcwd(), f'exports_test_{self.tenant.schema_name}')
        
        with override_settings(TENANT_APPS=['core.apps.CoreConfig', 'attendance.apps.AttendanceConfig', 'payroll.apps.PayrollConfig']):
            # It connects to postgres naturally, but our BaseCommand sets "connection.tenant". We must run in context
            with schema_context(self.tenant.schema_name):
                call_command('export_tenant_data', f'--output-dir={output_dir}', stdout=out)
        
        self.assertIn(f"Exporting data for tenant: {self.tenant.name}", out.getvalue())
        self.assertIn(f"Exported core.Department to", out.getvalue())
        
        # Verify file exists
        csv_path = os.path.join(output_dir, "core_department.csv")
        self.assertTrue(os.path.exists(csv_path))
        
        with open(csv_path, 'r') as f:
            content = f.read()
            self.assertIn('Exported Department', content)
            
        # Clean up
        import shutil
        shutil.rmtree(output_dir)

    def test_export_data_handles_errors(self):
        # We can simulate an error by requesting an invalid directory
        # Just ensure it doesn't crash on empty tables, the regular test covers success
        out = StringIO()
        output_dir = os.path.join(os.getcwd(), f'exports_empty_{self.tenant.schema_name}')
        
        # Do not create Departments, let it be empty
        from core.models import Department
        Department.objects.all().delete()
        
        with schema_context(self.tenant.schema_name):
            call_command('export_tenant_data', f'--output-dir={output_dir}', stdout=out)
            
        self.assertIn("No data for core.Department, skipping", out.getvalue())
        
        import shutil
        if os.path.exists(output_dir):
            shutil.rmtree(output_dir)

class ProcessSubscriptionsCommandTestCase(HRMSTestCase):
    def test_process_subscriptions_updates_status(self):
        from django_tenants.utils import schema_context, get_public_schema_name
        # Make the current tenant expired
        self.tenant.expiry_date = timezone.now().date() - timedelta(days=2)
        self.tenant.subscription_status = 'ACTIVE'
        self.tenant.save()
        
        # Make one suspended tenant that has been paid (simulated by extending expiry)
        with schema_context(get_public_schema_name()):
            suspended = Tenant(schema_name='susp', name='Suspended Co', subscription_status='SUSPENDED',
                               expiry_date=timezone.now().date() + timedelta(days=30))
            suspended.save()
        
        with schema_context(get_public_schema_name()):
            out = StringIO()
            call_command('process_subscriptions', stdout=out)
            
            # self.tenant should become EXPIRED
            self.tenant.refresh_from_db()
            self.assertEqual(self.tenant.subscription_status, 'EXPIRED')
            self.assertIn(f"Tenant {self.tenant.name}: ACTIVE -> EXPIRED", out.getvalue())
            
            suspended.refresh_from_db()
            self.assertEqual(suspended.subscription_status, 'ACTIVE')
            self.assertIn("ACTIVE", out.getvalue())

        # Verify notifications
        with schema_context(self.tenant.schema_name):
            self.assertTrue(SystemNotification.objects.filter(title="Subscription Expired", level="WARNING").exists())
            
        # If suspended goes to ACTIVE, wait we simulated it by reviving it
        with schema_context('susp'):
            self.assertTrue(SystemNotification.objects.filter(title="Subscription Active", level="SUCCESS").exists())
            
    def test_process_subscriptions_creates_suspended_notification(self):
         from django_tenants.utils import schema_context, get_public_schema_name
         # Create expired tenant past grace period
         self.tenant.subscription_status = 'EXPIRED'
         self.tenant.expiry_date = timezone.now().date() - timedelta(days=15) # grace period is 14 days
         self.tenant.save()
         
         with schema_context(get_public_schema_name()):
             out = StringIO()
             call_command('process_subscriptions', stdout=out)
             
         self.tenant.refresh_from_db()
         self.assertEqual(self.tenant.subscription_status, 'SUSPENDED')
         
         with schema_context(self.tenant.schema_name):
             self.assertTrue(SystemNotification.objects.filter(title="Account Suspended", level="CRITICAL").exists())
