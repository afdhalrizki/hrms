from django.shortcuts import redirect
from django.contrib.auth import logout
from django.contrib import messages
from django.conf import settings

class TenantAccessMiddleware:
    """
    Middleware to ensure that authenticated users only access tenants 
    they are explicitly assigned to, unless they are a global admin.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            if not request.user.is_active:
                logout(request)
                if request.path.startswith('/api/'):
                    from django.http import JsonResponse
                    return JsonResponse({"detail": "User account is inactive."}, status=403)
                
                messages.error(request, "Akun Anda telah dinonaktifkan.")
                login_url = getattr(settings, 'LOGIN_URL', '/admin/login/')
                return redirect(login_url)

            # 1. Global Admins and Superusers bypass all checks
            is_internal = getattr(request.user, 'is_global_admin', False) or request.user.is_superuser
            if is_internal:
                return self.get_response(request)

            # 2. Get current tenant from django-tenants middleware
            current_tenant = getattr(request, 'tenant', None)
            
            # 3. Public Admin Restriction: Only internal accounts can access public schema admin
            if current_tenant and current_tenant.schema_name == 'public':
                if request.path.startswith('/admin/'):
                    logout(request)
                    if not request.path.startswith('/api/'):
                        messages.error(request, "Akses ditolak. Portal ini hanya untuk akun internal.")
                    return redirect('/admin/login/')

            # 4. Tenant Admin Restriction: Ensure user is mapped to the current tenant
            if current_tenant and current_tenant.schema_name != 'public':
                if not request.user.tenants.filter(id=current_tenant.id).exists():
                    # Unauthorized access attempt
                    print(f"DEBUG: TenantAccessMiddleware FAILED - User {request.user.email} not in tenant {current_tenant.schema_name}")
                    if request.path.startswith('/api/'):
                        from django.http import JsonResponse
                        return JsonResponse({"detail": f"Akses ditolak. Anda tidak terdaftar di tenant {current_tenant.name}."}, status=403)

                    messages.error(request, f"Akses ditolak. Anda tidak terdaftar di tenant {current_tenant.name}.")
                    logout(request)
                    
                    # Redirect to admin login or standard login
                    login_url = getattr(settings, 'LOGIN_URL', '/admin/login/')
                    return redirect(f"{login_url}?next={request.path}")

        return self.get_response(request)


class SubscriptionMiddleware:
    """
    Ensures that tenants with expired or suspended subscriptions 
    have restricted access to the HRMS modules.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        current_tenant = getattr(request, 'tenant', None)
        
        # Don't block public schema or global admins
        if not current_tenant or getattr(current_tenant, 'schema_name', 'public') == 'public':
            return self.get_response(request)
            
        if request.user.is_authenticated and (request.user.is_superuser or getattr(request.user, 'is_global_admin', False)):
            return self.get_response(request)

        # 1. Total Suspension Check
        # If explicitly set to SUSPENDED or grace period has passed
        is_subscription_active = getattr(current_tenant, 'is_subscription_active', True)
        is_grace_period = getattr(current_tenant, 'is_grace_period', False)
        subscription_status = getattr(current_tenant, 'subscription_status', 'ACTIVE')

        is_suspended = (subscription_status == 'SUSPENDED' or 
                        (not is_subscription_active and not is_grace_period))
        
        if is_suspended:
            # Allow logout and billing (placeholder)
            if any(request.path.startswith(p) for p in ['/api/auth/logout/', '/api/billing/']):
                return self.get_response(request)
            
            # For other requests, return a 402 or block
            from django.http import JsonResponse
            return JsonResponse({
                "detail": "Subscription suspended. Please contact support or renew your plan.",
                "code": "SUBSCRIPTION_SUSPENDED"
            }, status=402)

        # 2. Read-Only Check for EXPIRED (Grace Period)
        is_expired = (subscription_status == 'EXPIRED' or not is_subscription_active)
        
        if is_expired and request.method not in ['GET', 'HEAD', 'OPTIONS']:
            # Allow logout and specific renewal actions
            if any(request.path.startswith(p) for p in ['/api/auth/logout/', '/api/billing/']):
                return self.get_response(request)
                
            from django.http import JsonResponse
            return JsonResponse({
                "detail": "Subscription expired. System is in Read-Only mode.",
                "code": "SUBSCRIPTION_EXPIRED_READ_ONLY"
            }, status=402)

        return self.get_response(request)
