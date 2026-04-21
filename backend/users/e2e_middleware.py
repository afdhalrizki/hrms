import logging
from django.conf import settings
from django.db import connection
from tenants.models import Tenant

logger = logging.getLogger(__name__)

class E2ETenantMiddleware:
    """
    Middleware to allow tenant override during E2E integrated tests.
    Only active in DEBUG mode.
    Allows passing 'test_tenant=schema_name' in query params or 'X-Tenant: schema_name' in headers.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not settings.DEBUG:
            return self.get_response(request)

        # 1. Capture tenant override from header or query param
        tenant_slug = request.headers.get('X-Tenant') or request.GET.get('test_tenant')
        
        if tenant_slug:
            if tenant_slug.lower() in ['public', 'shared']:
                connection.set_schema_to_public()
                request.tenant = None
            else:
                try:
                    tenant = Tenant.objects.get(schema_name=tenant_slug)
                    connection.set_tenant(tenant)
                    request.tenant = tenant
                    # logger.info(f"E2E: Forced tenant to {tenant_slug}")
                except Tenant.DoesNotExist:
                    logger.warning(f"E2E: Tenant {tenant_slug} not found")

        # 2. Default to 'company1' for non-public API calls if still in public schema
        # This prevents 401s on initial loads before the frontend can send X-Tenant
        elif request.path.startswith('/api/'):
            public_paths = ['/auth/', '/tenants/', '/billing/', '/internal/']
            if not any(p in request.path for p in public_paths):
                if connection.schema_name == 'public':
                    try:
                        tenant = Tenant.objects.get(schema_name='company1')
                        connection.set_tenant(tenant)
                        request.tenant = tenant
                        # logger.info("E2E: Defaulted to company1 schema")
                    except Tenant.DoesNotExist:
                        pass
        
        return self.get_response(request)
