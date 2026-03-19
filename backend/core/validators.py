from django.core.exceptions import ValidationError
from django.db import connection

def validate_storage_quota(value):
    """
    Validates that the current tenant has enough storage space left.
    Expects 'value' to be the file object being uploaded.
    """
    tenant = connection.tenant
    if not tenant:
        return

    # Check capacity
    limit_bytes = tenant.storage_limit_mb * 1024 * 1024
    if tenant.storage_used_bytes + value.size > limit_bytes:
        raise ValidationError(
            f"Storage quota exceeded. Your plan ({tenant.plan_type}) allows only {tenant.storage_limit_mb}MB."
        )
