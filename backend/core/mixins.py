from django_tenants.utils import schema_context
from django.db import transaction, connection

class TenantIsolationMixin:
    """
    Mixin to ensure that the entire request lifecycle within the view
    is wrapped in the correct tenant schema context and a transaction.
    This prevents search_path leakage between parallel requests in threaded environments.
    """
    def dispatch(self, request, *args, **kwargs):
        tenant_slug = request.headers.get('X-Tenant')
        if tenant_slug and tenant_slug != 'public':
            with transaction.atomic():
                with schema_context(tenant_slug):
                    # Force set on the connection inside the transaction
                    connection.set_tenant(request.tenant if hasattr(request, 'tenant') else tenant_slug)
                    return super().dispatch(request, *args, **kwargs)
        return super().dispatch(request, *args, **kwargs)
