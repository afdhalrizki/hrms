import logging
from django.db import connection
from users.models import Tenant

logger = logging.getLogger(__name__)

class E2ETenantMiddleware:
    """
    Middleware to force a specific tenant during E2E tests based on a header.
    This ensures that database isolation is maintained during automated testing.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        tenant_slug = request.headers.get('X-Tenant')
        
        if tenant_slug:
            try:
                from tenants.models import Tenant
                tenant = Tenant.objects.get(schema_name=tenant_slug)
                
                # Definitive set on the connection using raw SQL for persistence
                from django.db import connection
                with connection.cursor() as cursor:
                    cursor.execute(f'SET search_path TO "{tenant.schema_name}", public')
                
                # Update request object for downstream code
                request.tenant = tenant
                connection.set_tenant(tenant)
                
            except Tenant.DoesNotExist:
                logger.error(f"E2E: Tenant {tenant_slug} not found for {request.path}")
        
        return self.get_response(request)
