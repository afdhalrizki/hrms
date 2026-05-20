# Authorization System (RBAC) & Security Classification

This document outlines the **Role-Based Access Control (RBAC)** architecture, security policies, scope segmentation, and route/permission mapping matrix across the **HariKerja HRMS** platform (both global SaaS platform level and individual company tenant schemas).

---

## 🏗️ 1. SaaS-Level Authorization (Global RBAC - `public` Schema)

Global admin users operate solely under the `public` schema (accessed via the main domain `/login/portal-admin`) to manage overall SaaS platform infrastructure. Global roles are configured using the `global_role` column of the `User` model.

### Menu Access & Actions Table - Global Admin

| Role (Global Role) | Core Focus | Web Pages Accessed | Mobile App Access | Allowed Actions | Restricted Actions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`SUPERADMIN`** | Absolute management & SaaS infrastructure oversight. | • Main Dashboard (`/`) <br>• Registration Management (`/admin/registrations`) <br>• Global Admin Management (`/admin/global-admins`) <br>• Billing Configuration (`/admin/billing`) | Not intended for operational mobile use. | • Manage other Global Admin accounts (CRUD).<br>• Approve/reject new tenant registration requests.<br>• Perform *masquerade* (impersonation) into any client tenant.<br>• Manage billing plans, invoices, & storage quotas. | No system restrictions. |
| **`ONBOARDING_AGENT`**| Tenant onboarding and activation. | • Main Dashboard (`/`) <br>• Registration Management (`/admin/registrations`) | No functional access. | • View incoming registration list.<br>• Approve or reject new tenant registration requests (triggering auto PostgreSQL schema sync). | • Manage other global admins.<br>• Perform *masquerade* into client tenants.<br>• Access billing/financial modules. |
| **`SUPPORT_AGENT`** | Technical support & client troubleshooting. | • Main Dashboard (`/`) <br>• Masquerade into assigned tenant workspaces. | No functional access. | • Perform *masquerade* into client company tenant workspaces that are **specifically assigned** to them for troubleshooting. | • Approve/reject tenant registrations.<br>• Manage other global admins.<br>• Access billing/finances.<br>• Access unassigned tenant workspaces. |
| **`BILLING_ADMIN`** | SaaS subscription billing & platform quotas. | • Main Dashboard (`/`) <br>• Billing Management page (Invoices, subscription packages) | No functional access. | • Manage subscription plans.<br>• View & process billing invoices.<br>• Review & approve/reject quota reduction requests (`QuotaReductionRequest`). | • Approve/reject tenant registrations.<br>• Manage other global admins.<br>• Perform *masquerade* into client tenants. |

---

## 🏢 2. Client-Level Authorization (Tenant RBAC - Tenant Schema)

Inside the tenant's individual database schema, user permissions are determined by the `AccessRole` and `Employee` models. Access is governed either by Django's native `is_staff` flag (for Admins) or dynamic capability keys in the JSON permissions field of the user's active `AccessRole`.

### 2.1 Canonical Permission Pool
Permissions are defined as boolean flags inside the `AccessRole` model:
*   `tenant_manage_settings`: Modify branch coordinates, geofencing limits, late penalties, and BPJS rates.
*   `tenant_manage_hr`: Manage employee profiles, NIK, salary grades, branches, and account deactivations.
*   `tenant_manage_attendance`: Configure shifts, view/adjust log sheets, and approve clock-in corrections.
*   `tenant_manage_leaves`: Administer leave types, set balances, and process leave requests.
*   `tenant_manage_payroll`: Create/lock payroll periods, run PPh 21 tax calculations, and publish pay slips.
*   `tenant_view_analytics`: Access visual graphs for attendance patterns, demographic charts, and financial analytics.

### 2.2 System Default Roles
When a client tenant is first created, the system seeds non-deletable default roles:

| Role (Tenant Role) | Flag / Core Permission | Web Pages Accessed | Mobile App Access (Menus & Tabs) | Allowed Actions | Restricted Actions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`ADMIN`** <br>(Tenant Admin) | `is_staff = True` <br>(Bypasses all local RBAC checks) | **All Pages:**<br>• Dashboard<br>• Profile<br>• Employees<br>• Branches<br>• Attendance<br>• Leaves<br>• Reimbursements<br>• Payroll<br>• Workflows<br>• Analytics<br>• Reports<br>• Settings (Audit Logs, API Keys, Branding) | **Full Access:**<br>• Tabs: Home, Settings.<br>• Quick Access: Leaves, Payslip, Reimbursement, Profile, Documents, Correction, Performance, Reports. | • Manage all employees, departments, and branches.<br>• System configurations (Branding, API Keys, Workflows, Audit Logs).<br>• Approve all leave, reimbursement, and attendance corrections.<br>• Run payroll cycles and export reports. | • Cannot access data outside their own company tenant. |
| **`MANAGER HR`** | Role with permissions:<br>`tenant_manage_hr`, `tenant_manage_attendance`, `tenant_manage_payroll`, & all approval permissions (`tenant_approve_*`). | **Most Pages:**<br>• Dashboard<br>• Profile<br>• Employees<br>• Branches<br>• Attendance<br>• Leaves<br>• Reimbursements<br>• Payroll (Admin mode)<br>• Reports<br>• Analytics (if explicitly granted) | **Manager Access:**<br>• Tabs: Home, Settings.<br>• Quick Access: Leaves, Payslip, Reimbursement, Profile, Documents, Correction, Reports, Performance (if granted `tenant_view_performance_report`). | • Create & edit employee records.<br>• Manage global attendance schedules, shifts, and check-ins.<br>• Approve leave requests, reimbursements, and attendance corrections.<br>• Execute payroll and export payroll recap sheets. | • Modify primary tenant configurations (Branding, API Keys, Workflow config).<br>• View system *Audit Logs* (unless granted `tenant_view_audit_logs`).<br>• Delete system default roles (`Admin`, `HR Manager`, `Staff`). |
| **`STAFF`** <br>(Standard Employee) | No administrative privileges (empty/default permissions JSON). | **Self-Service Only:**<br>• Dashboard (No global stats)<br>• Profile (Own data only)<br>• Attendance (Self clock-in/out)<br>• Leaves (Self requests)<br>• Reimbursements (Self claims)<br>*(Admin pages are hidden)* | **Restricted Access:**<br>• Tabs: Home, Settings.<br>• Quick Access: Leaves, Payslip, Reimbursement, Profile, Documents, Correction.<br>*(Reports & Performance menus are hidden)* | • Clock in/out using face verification/GPS location.<br>• Submit leave and reimbursement requests.<br>• Request attendance corrections.<br>• View monthly payslips.<br>• Modify personal profile information. | • View other employees' records (salary, documents, addresses).<br>• Approve other users' requests.<br>• Access HR reports & company analytics dashboards.<br>• View settings and system configurations. |

---

## 🛡️ 3. Security Enforcement Mechanisms

The system adopts a *Defense in Depth* strategy. Verification of permissions is enforced at the Django Backend API, meaning frontend styling restrictions are merely for UX polish.

```mermaid
flowchart TD
    Request[Inbound API Request] --> CheckDomain[TenantAccessPermission:\nValidate Domain & JWT Token]
    CheckDomain --> CheckStatus[SubscriptionStatusPermission:\nCheck Tenant Subscription Status]
    
    CheckStatus -- SUSPENDED --> BlockAll[Block Access - HTTP 403 Forbidden]
    CheckStatus -- EXPIRED --> CheckSafe{"Is HTTP Request Method\nSafe (GET / Read-Only)?"}
    
    CheckSafe -- No --> BlockWrite[Block Access - HTTP 402 Payment Required]
    CheckSafe -- Yes --> CheckRBAC[HasTenantRBACPermission:\nEvaluate User Roles]
    CheckStatus -- ACTIVE --> CheckRBAC
    
    CheckRBAC --> CheckBypass{"Does Request Meet Bypass Rules?\n1. Self-Service (Own Records)\n2. Direct Supervisor"}
    
    CheckBypass -- Yes --> AllowAPI[Allow API Request]
    CheckBypass -- No --> CheckDBPerm{Is Permission Flag Enabled\nin active AccessRole?}
    
    CheckDBPerm -- Yes --> AllowAPI
    CheckDBPerm -- No --> BlockForbidden[Block Access - HTTP 403 Forbidden]

    classDef success fill:#10B981,stroke:#059669,color:#fff;
    classDef fail fill:#EF4444,stroke:#DC2626,color:#fff;
    classDef step fill:#3B82F6,stroke:#2563EB,color:#fff;
    classDef decision fill:#F59E0B,stroke:#D97706,color:#fff;
    
    class AllowAPI success;
    class BlockAll,BlockWrite,BlockForbidden fail;
    class Request,CheckDomain,CheckStatus,CheckRBAC step;
    class CheckSafe,CheckBypass,CheckDBPerm decision;
```

### 3.1 Security Bypass Exception Rules

1.  **Self-Service Override (Ownership Check)**:
    Employees without administrative roles are allowed to read or write their own records.
    *   *Example*: An employee can view their own payslips (`GET /api/payslips/`), edit their avatar (`PUT /api/users/me/`), and file a leave request (`POST /api/leave-requests/`). The backend permits this if the resource's owner ID matches `request.user.id`.
2.  **Direct Line Supervisor Override**:
    A designated supervisor can approve workflow items for their direct reports without holding global HR permissions.
    *   *Example*: The system checks if the applicant's `employee.supervisor_id` matches the current user's ID (`request.user.id`). If they match, the action is allowed.

---

## 📊 4. Web Navigation Routes vs RBAC Permissions

The navigation sidebar (`Sidebar.tsx`) dynamically renders routes based on permission keys returned from the API.

| Next.js Frontend Route | Page Description | Required Backend Permission Key | Frontend Guard Config |
| :--- | :--- | :--- | :--- |
| `/` | Operational dashboard overview & metrics. | N/A (Adapts statistics display depending on user access) | Open to all authenticated users. |
| `/profile` | User/employee personal profile info. | N/A (Self-service access) | Open to all, hidden on Public Tenant. |
| `/employees` | CRUD for Employees, Departments, & Roles. | `tenant_manage_hr` | `requiredPermission: 'tenant_manage_hr'` |
| `/branches` | Manage branch offices & coordinates. | `tenant_manage_hr` | `requiredPermission: 'tenant_manage_hr'` |
| `/attendance` | Shift schedules & attendance history. | `tenant_manage_attendance` (for management); Self-Service (for check-in) | Open to Staff for self clock-in. Approval tab requires `tenant_approve_attendance_correction`. |
| `/leaves` | Leave request submission & approval. | `tenant_approve_leave` (for approval); Self-Service (for own requests) | Open to Staff. Approval tab is hidden without approval permission. |
| `/reimbursements` | Expense claims & reimbursement approval. | `tenant_approve_reimbursement` (for approval); Self-Service (for own requests) | Open to Staff. Approval tab is hidden without approval permission. |
| `/payroll` | Monthly payslip generation & recap exports. | `tenant_manage_payroll` (to manage); `tenant_view_all_payslips` (to view all) | `requiredPermission: 'tenant_manage_payroll'` (Staff view their own payslips via profile/pop-ups). |
| `/workflows` | Configure multi-level approval lines. | `tenant_manage_settings` | `requiredPermission: 'tenant_manage_settings'` |
| `/analytics` | Interactive charts and attendance graphs. | `tenant_manage_hr` | `requiredPermission: 'tenant_manage_hr'` |
| `/reports` | Export historical HR data. | `tenant_manage_hr` | `requiredPermission: 'tenant_manage_hr'` |
| `/settings` | General tenant settings & module management. | `tenant_manage_settings` | `requiredPermission: 'tenant_manage_settings'` |
| `/settings/audit-logs` | System audit trails. | `tenant_view_audit_logs` | `requiredPermission: 'tenant_view_audit_logs'` |
| `/settings/api-keys` | Manage API keys. | `tenant_manage_settings` | `requiredPermission: 'tenant_manage_settings'` |
| `/settings/branding` | Corporate logos and UI customizer. | `tenant_manage_settings` | `requiredPermission: 'tenant_manage_settings'` |

---

## 📱 5. Mobile Application Permissions (Flutter)

The ESS Flutter app aligns with the backend's RBAC settings to adjust UI rendering:
*   **Module Visibility**: The mobile dashboard queries the tenant's active modules (`enabledModules`) from `TenantContext` on load. If the `payroll` module is inactive, the **Salary & Slips** menu is hidden.
*   **Supervisor Check**: The **Team Approvals** panel is only rendered if the employee profile has `is_supervisor = True` (having at least 1 direct report).

### Quick Access Menu Configuration (`home_screen.dart`):

1.  **Leaves (`qa_leaves`)**: **Always Visible** (Self-service leave requests).
2.  **Payslip (`qa_payslip`)**: **Always Visible** (View and download self payslips).
3.  **Reimbursement (`qa_reimbursement`)**: **Always Visible** (Self expense claims).
4.  **My Profile (`qa_profile`)**: **Always Visible** (Update own contact details).
5.  **Documents (`qa_documents`)**: **Always Visible** (Upload/view own ID, Tax certificates).
6.  **Correction (`qa_correction`)**: **Always Visible** (Request clock-in corrections).
7.  **Performance (`qa_performance`)**: **Conditional**. Only rendered if the user has `view_performance_report` (mapped to backend `tenant_view_performance_report`).
8.  **Reports (`qa_reports`)**: **Conditional**. Only rendered if the user has `manage_hr` (mapped to backend `tenant_manage_hr`).
