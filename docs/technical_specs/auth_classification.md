# HRMS Authentication and Authorization Classification

This document provides a comprehensive classification of Next.js frontend routes and their corresponding Django backend endpoints, outlining the authentication and authorization policies enforced across the HRMS platform.

---

## 1. Architectural Overview

The HRMS platform leverages a robust multi-tenant architecture. Security enforcement happens at both the Next.js server/client side and the Django backend layer.

### 1.1 Authentication Layer
* **Identity Verification:** Handled using JWT (via `rest_framework_simplejwt`) and session cookies.
* **Tenant Isolation:** Enforced by `TenantAccessPermission` on the backend, which ensures requests use a token explicitly bound to the tenant schema matching the `X-Tenant` header.

### 1.2 Authorization Layer (RBAC)
* **HasRBACPermission:** Checks if the authenticated user has the required permission assigned in their active `AccessRole` (e.g., `manage_employees`).
* **Self-Service Bypass:** Allows non-admin users to view/mutate their own records without requiring global administrative permissions.
* **Subscription Check:** `SubscriptionStatusPermission` enforces scope constraints based on tenant status (`ACTIVE`, `EXPIRED`, `SUSPENDED`).

---

## 2. Route & Permission Matrix

The following sections classify every frontend route and its respective authentication and authorization level.

### 2.1 Public & Unauthenticated Level
No authentication is required. Accessible to all visitors.

| Frontend Next.js Route | Relevant Backend Endpoint | Access Policy / Permission Classes |
| :--- | :--- | :--- |
| `/` | N/A | Static public page. No backend lock. |
| `/[locale]/about` | N/A | Static public page. No backend lock. |
| `/[locale]/signup` | `POST /api/public/signup/` | `AllowAny` (Enforces public schema only). |
| `/[locale]/login` | `POST /api/auth/login/` | `AllowAny` (Performs initial identity validation). |
| `/[locale]/registration`| `GET /api/internal/registrations/` | `AllowAny` |

### 2.2 Authenticated & Self-Service Level
Requires authentication. Standard employees can view or manage their own data but cannot see other employees' records.

| Frontend Next.js Route | Relevant Backend Endpoint | Required Backend Permissions |
| :--- | :--- | :--- |
| `/[locale]/profile` | `GET /api/users/me/` | `IsAuthenticated` + `TenantAccessPermission`. |
| `/[locale]/attendance` | `POST /api/attendance/` | `IsAuthenticated` + `allow_self_service = True`. |
| `/[locale]/leaves` | `POST /api/leave-requests/` | `IsAuthenticated` + `allow_self_service = True`. |
| `/[locale]/payroll` | `GET /api/payslips/` | `IsAuthenticated` + `allow_self_service = True`. |
| `/[locale]/reimbursements`| `POST /api/reimbursements/` | `IsAuthenticated` + `allow_self_service = True`. |

### 2.3 Management & Role-Based Level (RBAC)
Requires authentication and explicit administrative or manager privileges.

| Frontend Next.js Route | Relevant Backend Endpoint | Required RBAC Permission |
| :--- | :--- | :--- |
| `/[locale]/employees` | `/api/employees/` | `manage_employees` |
| `/[locale]/branches` | `/api/branches/` | `manage_branches` |
| `/[locale]/attendance` *(Approval Tab)* | `/api/attendance/` | `manage_attendance` (or Direct Supervisor) |
| `/[locale]/leaves` *(Approval Tab)* | `/api/leave-requests/` | `manage_leaves` (or Direct Supervisor) |
| `/[locale]/payroll` *(Admin Tab)* | `/api/payroll-periods/` | `manage_payroll` |
| `/[locale]/workflows` | `/api/workflow-configs/` | `manage_workflows` |
| `/[locale]/analytics` | `/api/core/dashboard-stats/`| `view_analytics` / `view_reports` |
| `/[locale]/reports` | `/api/audit-logs/` | `view_reports` |
| `/[locale]/settings` | `/api/tenant/settings/` | `manage_tenant_settings` |

### 2.4 System Global Administrative Level
Exclusively restricted to Global Administrators and Superusers.

| Frontend Next.js Route | Relevant Backend Endpoint | Required Permission |
| :--- | :--- | :--- |
| `/[locale]/admin/registrations` | `/api/internal/registrations/` | `request.user.is_superuser` or `global_role` |
| `/[locale]/portal-admin` | N/A (Admin interface) | Global system admin only |

---

## 3. Core Backend Permissions Deep Dive

### 3.1 `TenantAccessPermission`
```python
class TenantAccessPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        # 1. Enforces identity authentication
        # 2. Ensures the user belongs to the current active tenant
        # 3. Validates the JWT tenant scope matches the requested tenant
```

### 3.2 `HasRBACPermission`
```python
class HasRBACPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        # 1. Bypasses check for Tenant Admin (is_staff)
        # 2. Checks if view defines 'required_rbac_permission'
        # 3. Confirms user's employee role has the specific boolean flag enabled
```

### 3.3 `SubscriptionStatusPermission`
```python
class SubscriptionStatusPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        # Limits operational capability based on billing phase:
        # ACTIVE -> All actions allowed.
        # EXPIRED -> SAFE methods (GET) allowed; creation/mutation blocked.
        # SUSPENDED -> All requests blocked (403 Forbidden).
```
