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
                    messages.error(request, "Akses ditolak. Portal ini hanya untuk akun internal.")
                    return redirect('/admin/login/')

            # 4. Tenant Admin Restriction: Ensure user is mapped to the current tenant
            if current_tenant and current_tenant.schema_name != 'public':
                if not request.user.tenants.filter(id=current_tenant.id).exists():
                    # Unauthorized access attempt
                    messages.error(request, f"Akses ditolak. Anda tidak terdaftar di tenant {current_tenant.name}.")
                    logout(request)
                    
                    # Redirect to admin login or standard login
                    login_url = getattr(settings, 'LOGIN_URL', '/admin/login/')
                    return redirect(f"{login_url}?next={request.path}")

        return self.get_response(request)
