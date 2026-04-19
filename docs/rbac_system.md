# HRMS RBAC System Documentation

This document outlines the architecture, permissions, and roles management for the HR Management System (HRMS). The system uses a **Dynamic, Capability-Based RBAC** model to provide both flexibility for company admins and strict security enforcement.

## Architecture Overview

The RBAC system is built on three core pillars:

1.  **Canonical Permission Pool**: A fixed list of unique strings representing specific actions or data access levels.
2.  **Dynamic Access Roles**: Tenant-specific roles stored in the `AccessRole` model, where individual permissions are toggled via a `JSONField`.
3.  **Synthesized UI Identity**: A high-level mapping from granular permissions to UI-friendly labels (ADMIN, MANAGER, EMPLOYEE).

---

## Global Base User (Django AbstractUser)

As a global baseline, the system utilizes the native boolean flags provided by Django's `AbstractUser`, alongside our custom `is_global_admin` field, to establish fundamental access levels before applying the custom RBAC capabilities.

### Native Django Flags
*   **`is_superuser`**: Designates absolute access to the entire system. If `True`, the system ignores all other permission checks and grants full access. 
*   **`is_staff`**: Traditionally designates whether a user can access the Django Admin Panel (`/admin/`). In our HRMS context, this is also leveraged to identify the **Tenant Administrator**, guaranteeing them full administrative rights within their respective tenant (bypassing specific RBAC checks).
*   **`is_active`**: Determines whether the user account is active. This serves as our soft-deletion and account-blocking mechanism.

### Custom Multi-Tenant Flags
*   **`is_global_admin`**: A custom field designed specifically for our multi-tenant SaaS architecture. It allows system administrators (e.g., the platform owners) to bypass standard tenant isolation restrictions to manage cross-company configurations and provide support, cleanly separating "SaaS Administration" from "Company Administration".

---

## Canonical Permission List

The following keys are the "source of truth" for the system. Using these keys consistently across Backend (Views) and Frontend (Components) is mandatory.

### 1. Management & Settings
| Permission Key | Description |
| :--- | :--- |
| `manage_settings` | Modify tenant-wide configuration, branding, and API integrations. |
| `manage_hr` | Full control over Employees, Departments, Roles, and Branches. |
| `manage_access_roles` | Define and assign RBAC roles to other employees. |
| `view_audit_logs` | Access the system-wide audit trail for traceability. |
| `view_all_payslips` | View payslips for all employees (Finance/HR Manager). |
| `view_performance_report` | Access global or department-wide performance reports. |

### 2. Operational Modules
| Permission Key | Description |
| :--- | :--- |
| `manage_attendance` | Manage shifts, schedules, and view global attendance records. |
| `manage_payroll` | Calculate salaries, generate payslips, and manage pay grades. |
| `manage_reimbursement` | Configure reimbursement categories and global limits. |
| `manage_performance` | Create appraisal templates, KPIs, and Manage review cycles. |

### 3. Approval Workflow (Middle Management)
| Permission Key | Description |
| :--- | :--- |
| `approve_leave` | Approve or reject leave and time-off requests. |
| `approve_reimbursement` | Approve or reject expense and reimbursement claims. |
| `approve_attendance_correction` | Approve attendance corrections or manual clock-ins. |

---

## System Default Roles

Every new tenant is automatically initialized with these roles via the `post_schema_sync` signal. To ensure system stability, **Default Roles cannot be deleted.**

### 1. Admin (is_default: True)
*   **Purpose**: The primary account for the tenant.
*   **Permissions**: All permissions set to `True`.
*   **Primary Identity**: `ADMIN`

### 2. HR Manager (is_default: True)
*   **Purpose**: Operational HR management.
*   **Permissions**: `manage_hr`, `manage_attendance`, `manage_payroll`, and all `approve_*` permissions.
*   **Primary Identity**: `MANAGER`

### 3. Staff (is_default: True)
*   **Purpose**: Standard employee self-service.
*   **Permissions**: None (Only has "Self-Service" rights which are implicitly allowed for authenticated owners).
*   **Primary Identity**: `EMPLOYEE`

---

## Security Implementation Details

### Backend Enforcement
Views use the `HasRBACPermission` class. It checks:
1.  If the user is a **Tenant Admin** (`is_staff`): Full access is granted immediately.
2.  If a `required_rbac_permission` is set: The user's associated `AccessRole.permissions` JSON is checked for that key.
3.  **Ownership Check**: Even without a management permission, users can always `retrieve` or `update` their *own* records (e.g., their own profile or leave requests).

### Deletion Guard
The `AccessRole` model implements a `delete()` override:
```python
def delete(self, *args, **kwargs):
    if self.is_default:
        raise ValidationError("System default roles cannot be deleted.")
    return super().delete(*args, **kwargs)
```
