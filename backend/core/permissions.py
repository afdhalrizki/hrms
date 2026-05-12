from rest_framework import permissions
from core.models import Employee
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class TenantAccessPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        is_internal = getattr(request.user, 'is_global_admin', False) or request.user.is_superuser
        if is_internal:
            return True
            
        current_tenant = getattr(request, 'tenant', None)
        if current_tenant and current_tenant.schema_name != 'public':
            if not request.user.tenants.filter(id=current_tenant.id).exists():
                return False
            
            auth = getattr(request, 'auth', None)
            if auth:
                token_tenant_id = getattr(auth, 'get', lambda k: None)('tenant_id')
                if token_tenant_id and token_tenant_id != current_tenant.id:
                    return False
            
            return True
            
        return True

class HasRBACPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        from django.db import connection
        if not request.user or not request.user.is_authenticated:
            return False

        current_tenant = getattr(request, 'tenant', None)
        if not current_tenant or current_tenant.schema_name == 'public':
            # On public schema, allow IsStaff or GlobalAdmin for everything
            if getattr(request.user, 'is_global_admin', False) or request.user.is_superuser or request.user.is_staff:
                return True
            
            # Allow regular users for self-service actions ONLY
            if getattr(view, 'allow_self_service', False):
                action = getattr(view, 'action', None)
                if action in ['retrieve', 'me']:
                    return True
            return False
            
        if request.user.is_staff:
            return True

        try:
            has_employee = Employee.objects.filter(email=request.user.email).exists()
            if not has_employee:
                return False
        except Exception as e:
            return False
            
        required_perm = getattr(view, 'required_rbac_permission', None)
        employee = Employee.objects.filter(email=request.user.email).select_related('access_role').first()
        
        if not required_perm:
            return True
            
        if not employee:
            return False
            
        if employee.access_role and employee.access_role.permissions.get(required_perm, False):
            return True
            
        if request.method == 'GET':
            action = getattr(view, 'action', None)
            if action is None and getattr(view, 'allow_self_service', False) and not required_perm:
                return True
            if action == 'list':
                if getattr(view, 'allow_self_service_list', False):
                    return True
                return False
            if action == 'retrieve':
                return True
            if action is None and required_perm:
                return False
            return True
        
        standard_self_service_actions = ['create', 'retrieve', 'update', 'partial_update', 'me']
        action = getattr(view, 'action', None)
        if getattr(view, 'allow_self_service', False) and action in standard_self_service_actions:
            return True

        if getattr(view, 'detail', False):
            return True
            
        return False

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
            
        employee = Employee.objects.filter(email=request.user.email).first()
        if not employee:
            return False
            
        required_perm = getattr(view, 'required_rbac_permission', None)
        has_mgmt = False
        if required_perm and employee.access_role:
            has_mgmt = employee.access_role.permissions.get(required_perm, False)
            
        if has_mgmt:
            return True

        is_owner = False
        from users.models import User
        if isinstance(obj, User):
            is_owner = obj == request.user
        elif isinstance(obj, Employee):
            is_owner = obj == employee
        elif hasattr(obj, 'employee'):
            is_owner = obj.employee == employee
        
        is_supervisor = False
        if isinstance(obj, Employee):
            is_supervisor = obj.supervisor == employee
        elif hasattr(obj, 'employee') and obj.employee:
            is_supervisor = obj.employee.supervisor == employee
        
        if is_supervisor:
            return True
            
        standard_actions = ['retrieve', 'update', 'partial_update', 'destroy']
        action = getattr(view, 'action', None)
        if is_owner and action in standard_actions:
            return True
            
        return False


class FeatureRequiredPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if not hasattr(request, 'tenant'):
            return False
            
        required_feature = getattr(view, 'required_feature', None)
        if not required_feature:
            return True
            
        if getattr(request.tenant, 'plan_type', 'ESSENTIAL') == 'ENTERPRISE':
            return True
            
        enabled_modules = getattr(request.tenant, 'enabled_modules', [])
        return required_feature in enabled_modules

class SubscriptionStatusPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        current_tenant = getattr(request, 'tenant', None)
        if not current_tenant or current_tenant.schema_name == 'public':
            return True

        if 'BillingViewSet' in str(view.__class__):
            return True

        status = current_tenant.subscription_status
        if status == 'ACTIVE':
            return True
        
        if status == 'EXPIRED':
            if request.method in permissions.SAFE_METHODS:
                return True
            return False

        if status == 'SUSPENDED':
            return False
            
        return True
