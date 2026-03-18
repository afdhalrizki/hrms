from rest_framework import permissions
from core.models import Employee

class HasRBACPermission(permissions.BasePermission):
    """
    Checks if the employee requesting has the required RBAC permission defined 
    in the view's 'required_rbac_permission' attribute.
    If the user is a tenant admin (is_staff), they implicitly have full access.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        # Tenant admins (is_staff) override RBAC and have full access
        if request.user.is_staff:
            return True
            
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
            
        # For non-managers, we allow GET (view self) and POST (create self) for these views
        # We rely on ViewSet.get_queryset and has_object_permission to isolate data.
        if request.method in ['GET', 'POST']:
            return True
            
        return False

    def has_object_permission(self, request, view, obj):
        """
        Object-level permission: 
        1. Tenant Admin (is_staff) -> True
        2. Manager with 'manage_attendance' (if applicable) -> True
        3. Owner (obj.employee matches request.user) -> True
        """
        if request.user.is_staff:
            return True
            
        employee = Employee.objects.filter(email=request.user.email).first()
        if not employee:
            return False
            
        # Check if user is the owner of the record
        # Note: We assume the object has an 'employee' field
        is_owner = hasattr(obj, 'employee') and obj.employee == employee
        
        # Check if user is manager
        required_perm = getattr(view, 'required_rbac_permission', None)
        has_mgmt = False
        if required_perm and employee.access_role:
            has_mgmt = employee.access_role.permissions.get(required_perm, False)
            
        return is_owner or has_mgmt
