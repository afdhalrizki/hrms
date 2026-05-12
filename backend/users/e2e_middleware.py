from django.db import connection
from django.conf import settings
import logging
import time

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
        
        # Only retry if specifically enabled for E2E synchronization
        # OR if we are in a development/test environment and have a specific slug
        is_e2e_sync_needed = (
            request.headers.get('X-E2E-Retry') == 'true' or 
            getattr(settings, 'E2E_RETRY_ENABLED', False) or
            (tenant_slug and (getattr(settings, 'DEBUG', False) or getattr(settings, 'TESTING', False)))
        )
        
        # Increase retries for E2E to 30s as some slow environments need more time for seeding
        max_retries = 30 if is_e2e_sync_needed else 1

        for attempt in range(max_retries):
            try:
                # Fresh connection check: only close if this is a retry after failure
                if attempt > 0:
                    connection.close()
                    time.sleep(min(attempt * 0.5, 2)) # Exponential backoff
                
                with schema_context('public'):
                    if tenant_slug:
                        # If a specific slug is requested, ONLY try to resolve that slug
                        tenant = Tenant.objects.filter(schema_name=tenant_slug).first()
                    else:
                        # Fallback to hostname resolution ONLY if no slug is provided
                        try:
                            domain = Domain.objects.select_related('tenant').get(domain=hostname)
                            tenant = domain.tenant
                        except Domain.DoesNotExist:
                            # Localhost/Loopback fallback
                            if hostname in ['127.0.0.1', 'localhost', '0.0.0.0']:
                                tenant = Tenant.objects.filter(schema_name='public').first() or \
                                         Tenant.objects.all().first()
                
                if tenant:
                    if attempt > 0:
                        print(f"[E2E DEBUG] Tenant '{tenant_slug or hostname}' found after {attempt+1} attempts.")
                    break

                if max_retries > 1:
                    if attempt % 5 == 0:
                        print(f"[E2E DEBUG] Still waiting for tenant '{tenant_slug or hostname}' (Attempt {attempt+1}/{max_retries})...")
                else:
                    break
                
            except Exception as e:
                if attempt % 5 == 0:
                    print(f"[E2E DEBUG] Error resolving tenant '{tenant_slug or hostname}': {str(e)}")
                if max_retries <= 1:
                    break

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
