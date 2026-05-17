from rest_framework import permissions
from users.global_constants import GLOBAL_ROLE_PERMISSIONS

class HasGlobalPermission(permissions.BasePermission):
    """
    Memeriksa apakah pengguna memiliki hak akses spesifik di Portal Admin (SaaS).
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        if request.user.is_superuser or getattr(request.user, 'is_global_admin', False):
            return True
            
        if not request.user.global_role:
            return False

        required_perm = getattr(view, 'required_global_permission', None)
        if not required_perm:
            return True # Jika view tidak butuh perm spesifik, cukup pastikan dia punya global_role

        user_perms = GLOBAL_ROLE_PERMISSIONS.get(request.user.global_role, [])
        return required_perm in user_perms
