# Detailed Role & Permission Matrix (RBAC) - Web & Mobile

This document serves as the primary reference guide for Role-Based Access Control (RBAC) across the HRMS platform. It outlines the specific pages, menus, and functionalities that can be accessed or are restricted for each role on both the Web Application (Next.js Frontend) and Mobile Application (Flutter).

---

## 1. Scope Segmentation

The HRMS platform enforces a strict security boundary based on a multi-tenant architecture:
1.  **Global Admin (`public` schema)**: Manages overall SaaS platform infrastructure, tenant lifecycles, cross-company billing, and cross-tenant technical support.
2.  **Tenant User (Individual Tenant schema)**: Operates entirely within the isolated database schema of their respective company. Roles include Company Admin, HR Manager, and Staff.

---

## 2. Global Admin Role Matrix (SaaS Platform Operator)

Global Admin users operate solely under the `public` schema (accessed via the main domain `/login/portal-admin`). They are not bound to an individual company's employee profile.

### Menu Access & Actions Table - Global Admin

| Role (Global Role) | Core Focus | Web Pages Accessed | Mobile App Access | Allowed Actions | Restricted Actions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`SUPERADMIN`** | Absolute management & SaaS infrastructure oversight. | • Main Dashboard (`/`) <br>• Registration Management (`/admin/registrations`) <br>• Global Admin Management (`/admin/global-admins`) | Not intended for operational mobile use (bypasses checks if logged in). | • Manage other Global Admin accounts (CRUD).<br>• Approve/reject new tenant registration requests.<br>• Perform *masquerade* (impersonation) into any client tenant.<br>• Manage billing plans, invoices, & storage quotas. | No system restrictions. |
| **`ONBOARDING_AGENT`**| Tenant onboarding and activation. | • Main Dashboard (`/`) <br>• Registration Management (`/admin/registrations`) | No functional access. | • View incoming registration list.<br>• Approve or reject new tenant registration requests (triggering auto PostgreSQL schema sync). | • Manage other global admins.<br>• Perform *masquerade* into client tenants.<br>• Access billing/financial modules. |
| **`SUPPORT_AGENT`** | Technical support & client troubleshooting. | • Main Dashboard (`/`) <br>• Masquerade into assigned tenant workspaces. | No functional access. | • Perform *masquerade* into client company tenant workspaces that are **specifically assigned** to them for troubleshooting. | • Approve/reject tenant registrations.<br>• Manage other global admins.<br>• Access billing/finances.<br>• Access unassigned tenant workspaces. |
| **`BILLING_ADMIN`** | SaaS subscription billing & platform quotas. | • Main Dashboard (`/`) <br>• Billing Management page (Invoices, subscription packages) | No functional access. | • Manage subscription plans.<br>• View & process billing invoices.<br>• Review & approve/reject quota reduction requests (`QuotaReductionRequest`). | • Approve/reject tenant registrations.<br>• Manage other global admins.<br>• Perform *masquerade* into client tenants. |

---

## 3. Tenant User Role Matrix (Company Workspace)

Tenant users operate inside their respective company workspace (e.g., `company.harikerja.web.id`). Access is governed either by Django's native `is_staff` flag (for Admins) or dynamic capability keys in the JSON permissions field of the user's active `AccessRole`.

### Menu Access & Actions Table - Tenant User

| Role (Tenant Role) | Flag / Core Permission | Web Pages Accessed | Mobile App Access (Menus & Tabs) | Allowed Actions | Restricted Actions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`ADMIN`** <br>(Tenant Admin) | `is_staff = True` <br>(Bypasses all local RBAC checks) | **All Pages:**<br>• Dashboard<br>• Profile<br>• Employees<br>• Branches<br>• Attendance<br>• Leaves<br>• Reimbursements<br>• Payroll<br>• Workflows<br>• Analytics<br>• Reports<br>• Settings (Audit Logs, API Keys, Branding) | **Full Access:**<br>• Tabs: Home, Schedule, Payslip, Settings.<br>• Quick Access: Leaves, Payslip, Reimbursement, Profile, Documents, Correction, Performance, Reports. | • Manage all employees, departments, and branches.<br>• System configurations (Branding, API Keys, Workflows, Audit Logs).<br>• Approve all leave, reimbursement, and attendance corrections.<br>• Run payroll cycles and export reports. | • Cannot access data outside their own company tenant. |
| **`MANAGER HR`** | Role with permissions:<br>`tenant_manage_hr`, `tenant_manage_attendance`, `tenant_manage_payroll`, & all approval permissions (`tenant_approve_*`). | **Most Pages:**<br>• Dashboard<br>• Profile<br>• Employees<br>• Branches<br>• Attendance<br>• Leaves<br>• Reimbursements<br>• Payroll (Admin mode)<br>• Reports<br>• Analytics (if explicitly granted) | **Manager Access:**<br>• Tabs: Home, Schedule, Payslip, Settings.<br>• Quick Access: Leaves, Payslip, Reimbursement, Profile, Documents, Correction, Reports, Performance (if granted `tenant_view_performance_report`). | • Create & edit employee records.<br>• Manage global attendance schedules, shifts, and check-ins.<br>• Approve leave requests, reimbursements, and attendance corrections.<br>• Execute payroll and export payroll recap sheets. | • Modify primary tenant configurations (Branding, API Keys, Workflow config).<br>• View system *Audit Logs* (unless granted `tenant_view_audit_logs`).<br>• Delete system default roles (`Admin`, `HR Manager`, `Staff`). |
| **`STAFF`** <br>(Standard Employee) | No administrative privileges (empty/default permissions JSON). | **Self-Service Only:**<br>• Dashboard (No global stats)<br>• Profile (Own data only)<br>• Attendance (Self clock-in/out)<br>• Leaves (Self requests)<br>• Reimbursements (Self claims)<br>*(Admin pages are hidden)* | **Restricted Access:**<br>• Tabs: Home, Schedule, Payslip, Settings.<br>• Quick Access: Leaves, Payslip, Reimbursement, Profile, Documents, Correction.<br>*(Reports & Performance menus are hidden)* | • Clock in/out using face verification/GPS location.<br>• Submit leave and reimbursement requests.<br>• Request attendance corrections.<br>• View monthly payslips.<br>• Modify personal profile information. | • View other employees' records (salary, documents, addresses).<br>• Approve other users' requests.<br>• Access HR reports & company analytics dashboards.<br>• View settings and system configurations. |

---

## 4. Web Navigation Routes vs RBAC Permissions

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

## 5. Mobile Application Permissions (Flutter)

The mobile dashboard hides or shows quick-access widgets using the `hasPermission` helper method on the mobile `User` model.

### Quick Access Menu Configuration (`home_screen.dart`):

1.  **Leaves (`qa_leaves`)**: **Always Visible** (Self-service leave requests).
2.  **Payslip (`qa_payslip`)**: **Always Visible** (View and download self payslips).
3.  **Reimbursement (`qa_reimbursement`)**: **Always Visible** (Self expense claims).
4.  **My Profile (`qa_profile`)**: **Always Visible** (Update own contact details).
5.  **Documents (`qa_documents`)**: **Always Visible** (Upload/view own ID, Tax certificates).
6.  **Correction (`qa_correction`)**: **Always Visible** (Request clock-in corrections).
7.  **Performance (`qa_performance`)**: **Conditional**. Only rendered if the user has `view_performance_report` (mapped to backend `tenant_view_performance_report`).
8.  **Reports (`qa_reports`)**: **Conditional**. Only rendered if the user has `manage_hr` (mapped to backend `tenant_manage_hr`).

---

## 6. Security Enforcement Principles

The system adopts a *Defense in Depth* strategy. Verification of permissions is enforced at the Django Backend API, meaning frontend styling restrictions are merely for UX polish.

```mermaid
graph TD
    A[User Action / API Request] --> B{Bypass Superuser/Admin?}
    B -->|Yes: is_staff=True / SUPERADMIN| C[Access Granted]
    B -->|No| D{Requires Specific Permission?}
    D -->|No| E{Owner of Data / Self-Service?}
    E -->|Yes| C
    E -->|No| F[HTTP 403 Forbidden]
    D -->|Yes| G{Is Permission Key Enabled in JSON AccessRole?}
    G -->|Yes| C
    G -->|No| F
```

### A. Self-Service Override (Ownership Check)
On the Django backend, even if a standard employee lacks administrative permissions (e.g., `tenant_manage_hr`), the backend allows requests through if `allow_self_service` is set and:
*   The action is querying or updating their own `User`/`Employee` record.
*   The query is fetching their own payslips, leaves, attendance records, or reimbursements.

### B. Direct Line Supervisor Override
For approvals (such as leaves or attendance correction requests), the backend permits supervisors to approve requests originating from their direct subordinates, even if the supervisor does not hold a global `Admin` or `HR Manager` role.
