"""
Bootstrap tenants management command.
Creates a 'public' tenant and a 'company1' tenant for development.
Run once after: python manage.py migrate_schemas --shared
"""
from django.core.management.base import BaseCommand
from django_tenants.utils import schema_context
from tenants.models import Tenant, Domain


class Command(BaseCommand):
    help = 'Bootstrap public tenant and a sample company1 tenant'

    def handle(self, *args, **kwargs):
        # 1. Create the public / main tenant
        if not Tenant.objects.filter(schema_name='public').exists():
            public_tenant = Tenant(schema_name='public', name='Public')
            public_tenant.save(verbosity=0)
            Domain.objects.create(
                domain='localhost',
                tenant=public_tenant,
                is_primary=True
            )
            self.stdout.write(self.style.SUCCESS('Created public tenant at localhost'))
        else:
            self.stdout.write('Public tenant already exists, skipping...')

        # 2. Create company1 tenant
        if not Tenant.objects.filter(schema_name='company1').exists():
            company1 = Tenant(schema_name='company1', name='PT Company 1')
            company1.save(verbosity=0)  # auto_create_schema=True will provision the schema
            
            from django.conf import settings
            domain_name = f'company1.{settings.TENANT_DOMAIN_SUFFIX}'
            
            Domain.objects.create(
                domain=domain_name,
                tenant=company1,
                is_primary=True
            )
            self.stdout.write(self.style.SUCCESS(f'Created company1 tenant at {domain_name}'))
        else:
            self.stdout.write('company1 tenant already exists, skipping...')

        self.stdout.write(self.style.SUCCESS('Tenant bootstrapping complete!'))
