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

        # 2. Handle Unit Test Mode (Absolute Minimal Path)
        is_testing = getattr(settings, 'TESTING', False)
        if is_testing:
            # In unit tests, try to get it from connection first (set by TenantTestCase)
            # but ONLY if it's a real tenant, not a FakeTenant
            conn_tenant = getattr(connection, 'tenant', None)
            is_fake = 'FakeTenant' in str(type(conn_tenant))
            if conn_tenant and not is_fake:
                tenant = conn_tenant
            
            if not tenant:
                # Fallback to hostname resolution in unit tests (resolves 'testserver')
                try:
                    domain = Domain.objects.select_related('tenant').get(domain=hostname)
                    tenant = domain.tenant
                except Domain.DoesNotExist:
                    # If everything fails, use public or the first available tenant
                    tenant = Tenant.objects.filter(schema_name='public').first() or Tenant.objects.first()

            request.tenant = tenant
            connection.set_tenant(tenant)
            return self.get_response(request)

        # 3. Handle E2E/Production Mode (with Overrides and Retries)
        # Check for explicit override (from test_helper.ts or specific E2E clients)
        tenant_slug = (
            request.headers.get('X-Tenant') or 
            request.GET.get('test_tenant') or 
            request.COOKIES.get('test_tenant_e2e')
        )
        
        if tenant_slug:
            tenant = Tenant.objects.filter(schema_name=tenant_slug).first()

        if not tenant:
            for attempt in range(2):
                try:
                    connection.set_schema_to_public()
                    domain = Domain.objects.select_related('tenant').get(domain=hostname)
                    tenant = domain.tenant
                    break
                except (Domain.DoesNotExist, Exception):
                    # Localhost/Loopback fallback for local dev/mobile
                    if hostname in ['127.0.0.1', 'localhost', '0.0.0.0']:
                        tenant = Tenant.objects.filter(schema_name='public').first() or \
                                 Tenant.objects.all().first()
                        if tenant:
                            break
                    
                    if attempt == 0:
                        import time
                        connection.close() 
                        time.sleep(1)
                        continue
                    
                    from django.http import Http404
                    raise Http404(f"Tenant not found for hostname: {hostname}")

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
