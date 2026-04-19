'use client';

import { useAuth } from '@/context/AuthContext';

/**
 * Custom hook to check if the current user has a specific RBAC permission.
 * Handles the following logic:
 * 1. Global Admin / Superuser -> Always True
 * 2. Tenant Admin (is_staff) -> Always True
 * 3. Specific permission key in user.permissions -> True/False
 */
export function usePermission() {
  const { user } = useAuth();

  const hasPermission = (permissionKey: string): boolean => {
    if (!user) return false;

    // 1. Global / Superuser / Tenant Admin override RBAC
    if (user.is_global_admin || user.is_staff) {
      return true;
    }

    // 2. Check for granular permission
    return !!user.permissions?.[permissionKey];
  };

  return { hasPermission };
}
