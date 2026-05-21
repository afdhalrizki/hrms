import hashlib
from rest_framework import authentication, exceptions
from .models import APIKey
from django.utils import timezone

class APIKeyAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        api_key_header = request.META.get('HTTP_X_API_KEY')
        if not api_key_header:
            return None

        try:
            # Format expected: prefix.secret
            prefix, secret = api_key_header.split('.')
        except ValueError:
            raise exceptions.AuthenticationFailed('Invalid API Key format.')

        try:
            api_key = APIKey.objects.get(
                key_prefix=prefix, 
                is_active=True
            )
        except APIKey.DoesNotExist:
            raise exceptions.AuthenticationFailed('Invalid API Key.')

        # Check expiry
        if api_key.expires_at and api_key.expires_at < timezone.now():
            raise exceptions.AuthenticationFailed('API Key has expired.')

        # Verify hash
        # In a real app, use a proper salt or HMAC, but here we hash the secret
        provided_hash = hashlib.sha256(secret.encode()).hexdigest()
        if provided_hash != api_key.key_hash:
            raise exceptions.AuthenticationFailed('Invalid API Key.')

        # Update last used
        api_key.last_used_at = timezone.now()
        api_key.save(update_fields=['last_used_at'])

        # Since it's a tenant-specific key, we return None for User (as it's a machine account)
        # Since APIKey is inside a tenant app (core), any key retrieved is already in the current tenant's schema.
        return (None, api_key) # (User, Auth)
