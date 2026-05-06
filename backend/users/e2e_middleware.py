from django.db import connection
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class E2ETenantMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == 'OPTIONS':
            return self.get_response(request)
            
        from tenants.models import Tenant, Domain
        
        # 1. Resolve Hostname
        hostname = request.get_host().split(':')[0]
        tenant = None

        # 2. Handle Unit Test vs E2E Test Mode
        is_testing = getattr(settings, 'TESTING', False)
        tenant_slug = (
            request.headers.get('X-Tenant') or 
            request.headers.get('X-Tenant-Domain') or 
            request.GET.get('test_tenant') or 
            request.COOKIES.get('test_tenant_e2e')
        )
        
        if is_testing and not tenant_slug:
            # In unit tests (no headers), try to get it from connection first
            conn_tenant = getattr(connection, 'tenant', None)
            is_fake = 'FakeTenant' in str(type(conn_tenant))
            if conn_tenant and not is_fake:
                tenant = conn_tenant
            
            if not tenant:
                # Fallback to hostname resolution in unit tests
                try:
                    domain = Domain.objects.select_related('tenant').get(domain=hostname)
                    tenant = domain.tenant
                except Domain.DoesNotExist:
                    tenant = Tenant.objects.filter(schema_name='public').first() or Tenant.objects.first()

            request.tenant = tenant
            connection.set_tenant(tenant)
            return self.get_response(request)

        # 3. Handle E2E/Production Mode (with Overrides)
        if tenant_slug:
            # Strip domains
            if tenant_slug.endswith('.localhost') or tenant_slug.endswith('.127.0.0.1'):
                tenant_slug = tenant_slug.split('.')[0]
            # Convert to schema format (dashes to underscores)
            tenant_slug = tenant_slug.replace('-', '_').lower()
        
        from django_tenants.utils import schema_context
        
        for attempt in range(15):
            try:
                # Force a fresh connection to the database
                connection.close()
                
                with schema_context('public'):
                    if tenant_slug:
                        tenant = Tenant.objects.filter(schema_name=tenant_slug).first()
                        if tenant:
                            print(f"[E2E DEBUG] Resolved tenant '{tenant_slug}' from header/query")
                            break
                        else:
                            print(f"[E2E DEBUG] Tenant slug '{tenant_slug}' NOT FOUND in DB. Attempt {attempt+1}/15")
                    
                    if not tenant:
                        # Fallback to hostname resolution
                        try:
                            domain = Domain.objects.select_related('tenant').get(domain=hostname)
                            tenant = domain.tenant
                            print(f"[E2E DEBUG] Resolved tenant '{tenant.schema_name}' from hostname '{hostname}'")
                            break
                        except Domain.DoesNotExist:
                            # Localhost/Loopback fallback
                            if hostname in ['127.0.0.1', 'localhost', '0.0.0.0']:
                                tenant = Tenant.objects.filter(schema_name='public').first() or \
                                         Tenant.objects.all().first()
                                if tenant:
                                    print(f"[E2E DEBUG] Fallback to tenant '{tenant.schema_name}' for hostname '{hostname}'")
                                    break

                # If no tenant found yet, wait and retry
                import time
                print(f"[E2E DEBUG] Retrying tenant resolution in 1s (Attempt {attempt+1}/15)...")
                time.sleep(1)
                
            except Exception as e:
                print(f"[E2E DEBUG] Error during tenant resolution (Attempt {attempt+1}/15): {e}")
                import time
                time.sleep(1)

        if not tenant:
            from django.http import Http404
            print(f"[E2E CRITICAL] Tenant NOT FOUND! Host: {hostname}, Slug: {tenant_slug}, Path: {request.path}")
            raise Http404(f"Tenant not found for hostname: {hostname} (Slug: {tenant_slug})")

        # 4. Apply Context
        request.tenant = tenant
        if tenant:
            connection.set_tenant(tenant)
        else:
            connection.set_schema_to_public()
        
        # 4. Optional: Force URLCONF if needed by some apps
        if hasattr(settings, 'ROOT_URLCONF'):
            request.urlconf = settings.ROOT_URLCONF
            
        return self.get_response(request)
