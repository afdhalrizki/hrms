from rest_framework import permissions
from core.models import Employee

class TenantAccessPermission(permissions.BasePermission):
    """
    Enforces that the authenticated user actually belongs to the current tenant.
    This is necessary because Django's TenantAccessMiddleware cannot verify DRF JWT tokens
    since request.user is set by DRF after Django middleware runs.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        is_internal = getattr(request.user, 'is_global_admin', False) or request.user.is_superuser
        if is_internal:
            return True
            
        current_tenant = getattr(request, 'tenant', None)
        if current_tenant and current_tenant.schema_name != 'public':
            return request.user.tenants.filter(id=current_tenant.id).exists()
            
        return True

class HasRBACPermission(permissions.BasePermission):
    """
    Checks if the employee requesting has the required RBAC permission defined 
    in the view's 'required_rbac_permission' attribute.
    If the user is a tenant admin (is_staff), they implicitly have full access.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        # Hard isolation: Never allow API access on public schema
        if getattr(request, 'tenant', None) and request.tenant.schema_name == 'public':
            return False

        # Tenant admins (is_staff) override RBAC and have full access
        if request.user.is_staff:
            return True

        # Hard isolation: User MUST have an Employee record in this tenant schema
        # to be considered authorized for this tenant.
        has_employee = Employee.objects.filter(email=request.user.email).exists()
        if not has_employee:
            return False
            
        required_perm = getattr(view, 'required_rbac_permission', None)
        
        # Get the employee profile within the current tenant schema
        employee = Employee.objects.filter(email=request.user.email).select_related('access_role').first()
        
        # If the view doesn't explicitly declare a required permission, allow access
        # The view's get_queryset should handle data isolation for authenticated users.
        if not required_perm:
            return True
            
        if not employee:
            return False
            
        # Managers/Admins with the specific permission get full access immediately
        if employee.access_role and employee.access_role.permissions.get(required_perm, False):
            return True
            
        # For non-managers (no direct permission):
        if request.method == 'GET':
            if view.action == 'list':
                # List views are restrictive: require management perm OR explicit list self-service
                if getattr(view, 'allow_self_service_list', False):
                    return True
                return False
            # Always allow retrieve (detail) as data isolation is handled by get_queryset
            return True
        
        # Mutations (POST, PATCH, PUT)
        standard_self_service_actions = ['create', 'retrieve', 'update', 'partial_update']
        if getattr(view, 'allow_self_service', False) and view.action in standard_self_service_actions:
            return True

        # Allow detail actions to bypass global check so they can be handled by has_object_permission
        # This is CRITICAL for supervisors who don't have global management permissions
        if getattr(view, 'detail', False):
            return True
            
        return False

    def has_object_permission(self, request, view, obj):
        """
        Object-level permission: 
        1. Tenant Admin (is_staff) -> True
        2. Manager with 'manage_attendance' (if applicable) -> True
        3. Supervisor of the employee -> True
        4. Owner (obj.employee matches request.user) -> Only for standard CRUD
        """
        if request.user.is_staff:
            return True
            
        employee = Employee.objects.filter(email=request.user.email).first()
        if not employee:
            return False
            
        # Check if user is manager
        required_perm = getattr(view, 'required_rbac_permission', None)
        has_mgmt = False
        if required_perm and employee.access_role:
            has_mgmt = employee.access_role.permissions.get(required_perm, False)
            
        if has_mgmt:
            return True

        # Check if user is the owner of the record
        is_owner = False
        if isinstance(obj, Employee):
            is_owner = obj == employee
        elif hasattr(obj, 'employee'):
            is_owner = obj.employee == employee
        
        # Check if user is the supervisor of the owner
        is_supervisor = False
        if isinstance(obj, Employee):
            is_supervisor = obj.supervisor == employee
        elif hasattr(obj, 'employee') and obj.employee:
            is_supervisor = obj.employee.supervisor == employee
        
        if is_supervisor:
            return True
            
        # Self-service: Owners can only perform standard CRUD
        standard_actions = ['retrieve', 'update', 'partial_update', 'destroy']
        if is_owner and view.action in standard_actions:
            return True
            
        return False


class FeatureRequiredPermission(permissions.BasePermission):
    """
    Checks if the tenant has a specific module/feature enabled.
    The view must define 'required_feature'.
    """
    def has_permission(self, request, view):
        if not hasattr(request, 'tenant'):
            return False
            
        required_feature = getattr(view, 'required_feature', None)
        if not required_feature:
            return True
            
        # Enterprise tenants have all features
        if getattr(request.tenant, 'plan_type', 'ESSENTIAL') == 'ENTERPRISE':
            return True
            
        enabled_modules = getattr(request.tenant, 'enabled_modules', [])
        return required_feature in enabled_modules

class SubscriptionStatusPermission(permissions.BasePermission):
    """
    Enforces the subscription state policies (pricing_strategy_v2):
    1. ACTIVE: Full access.
    2. EXPIRED (Grace Period): Read-Only access (GET).
    3. SUSPENDED: No access (403 Forbidden).
    
    Exemptions:
    - Public schema access (always allowed for registration/login).
    - Billing module (to allow tenants to pay and renew).
    """
    def has_permission(self, request, view):
        # 1. Exempt public schema
        current_tenant = getattr(request, 'tenant', None)
        if not current_tenant or current_tenant.schema_name == 'public':
            return True

        # 2. Exempt Billing ViewSet (to allow recovery/payment)
        # We check the view's name or a custom attribute
        if 'BillingViewSet' in str(view.__class__):
            return True

        status = current_tenant.subscription_status
        
        if status == 'ACTIVE':
            return True
        
        if status == 'EXPIRED':
            # Read-Only Access (Grace Period)
            if request.method in permissions.SAFE_METHODS:
                return True
            return False

        if status == 'SUSPENDED':
            # Block All Access
            return False
            
        return True
