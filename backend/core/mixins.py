from django_tenants.utils import schema_context
from django.db import transaction, connection

class TenantIsolationMixin:
    """
    Mixin to ensure that the entire request lifecycle within the view
    is wrapped in the correct tenant schema context and a transaction.
    This prevents search_path leakage between parallel requests in threaded environments.
    """
    def dispatch(self, request, *args, **kwargs):
        # Use the tenant already resolved by the middleware
        tenant = getattr(request, 'tenant', None)
        if tenant and tenant.schema_name != 'public':
            with transaction.atomic():
                with schema_context(tenant.schema_name):
                    # Ensure connection is in sync with the schema context
                    connection.set_tenant(tenant)
                    return super().dispatch(request, *args, **kwargs)
        return super().dispatch(request, *args, **kwargs)
