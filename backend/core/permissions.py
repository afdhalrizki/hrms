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
        
        # If the view doesn't explicitly declare a required permission, allow access
        if not required_perm:
            return True
            
        # Get the employee profile within the current tenant schema
        employee = Employee.objects.filter(email=request.user.email).select_related('access_role').first()
            
        if not employee or not employee.access_role:
            # User is authenticated but has no employee record or no access role assigned
            return False
            
        # Check if the JSON field contains the required permission
        return employee.access_role.permissions.get(required_perm, False)
