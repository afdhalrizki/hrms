from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from tenants.models import Tenant

User = get_user_model()

class Command(BaseCommand):
    help = 'Create demo users and link them to tenants'

    def handle(self, *args, **kwargs):
        # 1. Create Global Admin
        global_admin_email = 'admin@harikerja.com'
        if not User.objects.filter(email=global_admin_email).exists():
            User.objects.create_superuser(
                email=global_admin_email,
                password='admin123'
            )
            self.stdout.write(self.style.SUCCESS(f'Created Global Admin: {global_admin_email}'))
        else:
            self.stdout.write(f'Global Admin {global_admin_email} already exists.')

        # 2. Create Company1 Admin
        company1_email = 'admin@company1.localhost'
        password = 'admin123'
        
        try:
            company1_tenant = Tenant.objects.get(schema_name='company1')
            
            if not User.objects.filter(email=company1_email).exists():
                user = User.objects.create_user(
                    email=company1_email,
                    password=password,
                    is_staff=True
                )
                user.tenants.add(company1_tenant)
                self.stdout.write(self.style.SUCCESS(f'Created Tenant Admin: {company1_email} linked to company1'))
            else:
                user = User.objects.get(email=company1_email)
                user.tenants.add(company1_tenant)
                self.stdout.write(f'Tenant Admin {company1_email} already exists, ensured linkage.')
                
        except Tenant.DoesNotExist:
            self.stdout.write(self.style.ERROR('Tenant "company1" does not exist. Run bootstrap_tenants first.'))

        self.stdout.write(self.style.SUCCESS('Demo seeding complete!'))
