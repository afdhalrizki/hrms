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
        tenant_slug = request.headers.get('X-Tenant') or request.COOKIES.get('test_tenant_e2e')
        
        if tenant_slug:
            try:
                from django_tenants.utils import schema_context
                from tenants.models import Tenant
                
                with schema_context('public'):
                    tenant = Tenant.objects.get(schema_name=tenant_slug)
                
                # Use django-tenants built-in method
                connection.set_tenant(tenant)
                
                # Update request object for downstream code
                request.tenant = tenant
                
                # Double check and force search_path if needed
                with connection.cursor() as cursor:
                    cursor.execute("SHOW search_path")
                    search_path = cursor.fetchone()[0]
                    if tenant_slug != 'public' and tenant_slug not in search_path:
                         cursor.execute(f'SET search_path TO "{tenant_slug}", public')
                
                # logger.debug(f"E2E: Switched to {tenant_slug}")
                
            except Tenant.DoesNotExist:
                logger.error(f"E2E: Tenant {tenant_slug} not found for {request.path}")
            except Exception as e:
                logger.error(f"E2E: Error setting tenant {tenant_slug} for {request.path}: {e}")
        
        return self.get_response(request)

