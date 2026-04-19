from django.conf import settings
from django.db import connection
from tenants.models import Tenant

class E2ETenantMiddleware:
    """
    Middleware to allow tenant override during E2E integrated tests.
    Only active in DEBUG mode.
    Allows passing 'test_tenant=schema_name' in query params or 'X-Tenant: schema_name' in headers.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if settings.DEBUG:
            # 1. Look for tenant override in query params or X-Tenant header
            tenant_slug = request.GET.get('test_tenant') or request.headers.get('X-Tenant')
            
            if tenant_slug:
                if tenant_slug.lower() in ['public', 'shared']:
                    # Reset to public schema
                    connection.set_schema_to_public()
                    request.tenant = None # django-tenants convention for public
                    return self.get_response(request)
                    
                try:
                    # In a real environment, we'd cache this
                    tenant = Tenant.objects.get(schema_name=tenant_slug)
                    
                    # Override the tenant on the request
                    request.tenant = tenant
                    
                    # Force the database connection to the specific schema
                    connection.set_tenant(tenant)
                    
                except (Tenant.DoesNotExist, Exception):
                    # Fallback to whatever django-tenants found via hostname
                    pass
                    
        response = self.get_response(request)
        return response
