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
        
        tenant_slug = (
            request.headers.get('X-Tenant') or 
            request.GET.get('test_tenant') or 
            request.COOKIES.get('test_tenant_e2e')
        )
        hostname = request.get_host().split(':')[0]
        
        tenant = None
        
        # 1. Handle E2E Forced Tenant
        if tenant_slug:
            if tenant_slug.startswith('worker_'):
                try:
                    worker_idx = int(tenant_slug.split('_')[1])
                    stable_idx = worker_idx % 4
                    tenant_slug = f"worker_{stable_idx}"
                except (ValueError, IndexError):
                    pass
            
            try:
                tenant = Tenant.objects.get(schema_name=tenant_slug)
            except Tenant.DoesNotExist:
                pass

        # 2. Handle Normal Host-based Resolution
        if not tenant:
            try:
                domain = Domain.objects.select_related('tenant').get(domain=hostname)
                tenant = domain.tenant
            except Domain.DoesNotExist:
                # Default to public
                try:
                    tenant = Tenant.objects.get(schema_name='public')
                except Tenant.DoesNotExist:
                    # If even public is missing, we are in trouble, but let's try to find ANY tenant
                    tenant = Tenant.objects.first()
                    if not tenant:
                        from django.http import Http404
                        raise Http404("No tenants available in the system yet. Database might be initializing.")

        # 3. Apply Context
        request.tenant = tenant
        connection.set_tenant(tenant)
        
        # 4. Optional: Force URLCONF if needed by some apps
        if hasattr(settings, 'ROOT_URLCONF'):
            request.urlconf = settings.ROOT_URLCONF
            
        return self.get_response(request)
