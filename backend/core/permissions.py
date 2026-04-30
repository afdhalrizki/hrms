from rest_framework import permissions
from core.models import Employee
import logging

logger = logging.getLogger(__name__)

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
            # Check 1: User must belong to the tenant
            if not request.user.tenants.filter(id=current_tenant.id).exists():
                return False
                
            # Check 2: Token must be issued for this tenant
            # request.auth is the validated token object in DRF (SimpleJWT)
            auth = getattr(request, 'auth', None)
            if auth:
                # SimpleJWT Token objects have a .get() method for claims
                token_tenant_id = getattr(auth, 'get', lambda k: None)('tenant_id')
                if token_tenant_id and token_tenant_id != current_tenant.id:
                    logger.warning(f"Cross-tenant token attempt: User {request.user.email} (token tenant {token_tenant_id}) accessing tenant {current_tenant.id}")
                    return False
            
            return True
            
        return True

class HasRBACPermission(permissions.BasePermission):
    """
    Checks if the employee requesting has the required RBAC permission defined 
    in the view's 'required_rbac_permission' attribute.
    If the user is a tenant admin (is_staff), they implicitly have full access.
    """
    def has_permission(self, request, view):
        from django.db import connection
        if not request.user or not request.user.is_authenticated:
            return False
            
            

        # 2. Check if we have a valid tenant context
        current_tenant = getattr(request, 'tenant', None)
        if not current_tenant or current_tenant.schema_name == 'public':
            is_global = getattr(request.user, 'is_global_admin', False) or request.user.is_superuser
            return is_global
            
        if request.user.is_staff:
            return True

        # The tenant should already be set by E2ETenantMiddleware or TenantMainMiddleware.
        # Proceed to employee verification.
        try:
            has_employee = Employee.objects.filter(email=request.user.email).exists()
            if not has_employee:
                return False
        except Exception as e:
            # Table doesn't exist or other DB error - likely wrong schema context
            logger.error(f"Error checking employee permission on tenant {current_tenant.schema_name}: {e}")
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
            action = getattr(view, 'action', None)
            
            # Allow self-service for raw APIViews (where action is None)
            # but only if no specific management permission is required.
            if action is None and getattr(view, 'allow_self_service', False) and not required_perm:
                return True

            if action == 'list':
                # List views are restrictive: require management perm OR explicit list self-service
                if getattr(view, 'allow_self_service_list', False):
                    return True
                return False
            
            # If it's a ViewSet retrieve, allow it (data isolation handled by get_queryset)
            if action == 'retrieve':
                return True
                
            # If it's a raw APIView (no DRF action) and a permission is required, 
            # we must NOT allow it to pass through to line 74.
            if action is None and required_perm:
                return False

            # Always allow other GETs as data isolation is handled by get_queryset
            return True
        
        # Mutations (POST, PATCH, PUT)
        standard_self_service_actions = ['create', 'retrieve', 'update', 'partial_update', 'me']
        action = getattr(view, 'action', None)
        if getattr(view, 'allow_self_service', False) and action in standard_self_service_actions:
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
        from users.models import User
        if isinstance(obj, User):
            is_owner = obj == request.user
        elif isinstance(obj, Employee):
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
        action = getattr(view, 'action', None)
        if is_owner and action in standard_actions:
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
