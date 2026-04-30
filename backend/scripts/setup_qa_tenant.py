import os
import sys
import django

# Add the current directory to sys.path so we can find 'config'
sys.path.append(os.getcwd())

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from tenants.models import Tenant, Domain

def setup_qa():
    print("🛠️ Setting up QA Tenant...")
    
    # 1. Ensure Public Tenant exists
    public_tenant, created = Tenant.objects.get_or_create(
        schema_name='public',
        defaults={'name': 'HRMS Public Console'}
    )
    if created:
        print("✅ Created 'public' tenant.")
    else:
        print("ℹ️ 'public' tenant already exists.")

    # 2. Ensure Main Domain exists
    domain_name = os.environ.get('TENANT_DOMAIN_SUFFIX', 'harikerja.web.id')
    domain, created = Domain.objects.get_or_create(
        domain=domain_name,
        defaults={'tenant': public_tenant, 'is_primary': True}
    )
    if created:
        print(f"✅ Created domain mapping for '{domain_name}'.")
    else:
        print(f"ℹ️ Domain mapping for '{domain_name}' already exists.")

    # 3. Ensure localhost domain exists (for smoke tests)
    Domain.objects.get_or_create(
        domain='localhost',
        defaults={'tenant': public_tenant, 'is_primary': False}
    )
    print("✅ Ensured 'localhost' is mapped to public tenant.")

if __name__ == "__main__":
    setup_qa()
