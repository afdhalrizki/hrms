# Module Documentation: Multi-Tenancy & SaaS Architecture

## 1. General Overview
The **Tenants** module is the architectural heart of the HariKerja HRMS SaaS platform. It manages the multi-tenant layout using **database schema isolation** to guarantee absolute data segregation for each subscriber. It also enforces feature availability based on subscription tiers, stores company branding configurations, and guides the onboarding pipeline for new organizations.

* **Target Users**: Platform Superadmins and Tenant (Company) Administrators.

---

## 2. Key Database Models
This module integrates with the `django-tenants` engine and relies on models in the `tenants` app:

1. **`Tenant`**: The main model representing a customer's company. Inherits from `TenantMixin`. Stores metadata, logo uploads, primary/secondary branding hex colors, calculation variables (overtime divisor, JKK rates), daily attendance penalties, approval rules, and subscription terms.
2. **`Domain`**: Holds subdomain paths routing to specific tenant schemas. Inherits from `DomainMixin`.
3. **`RegistrationRequest`**: Holds onboarding forms submitted by prospective clients for Superadmin review.

---

## 3. Core Features & Capabilities
* **Robust Data Segregation**: Every company operates within a distinct PostgreSQL schema (e.g., `tenant_acme`), blocking cross-organization data leaks completely.
* **Subscription Tiering & Module Enforcement**: Enforces feature access based on `plan_type`:
  * `FREE`: Attendance module only. Caps at 10 active employee slots.
  * `ESSENTIAL`: Attendance and Leave module. Caps at 25 employee slots.
  * `PROFESSIONAL`: Core operational modules: Attendance, Leave, Payroll, and Reimbursement. Caps at 100 employee slots.
  * `PREMIUM`: All standard modules including Appraisal, KPIs, and Custom RBAC. Caps at 500 employee slots.
  * `ENTERPRISE`: Full feature suites with enterprise priority quotas (2000 employee slots).
* **Flexible Corporate Policies**: Admin controls over daily late penalties, overtime divisor (standard Indonesian value: 173), attendance check platform limitations (Mobile-only or Mobile & Web), and biometric constraints.
* **Custom Document Approvals**: Configures who must validate requests: Direct Supervisors only, HR Admins only, or both.
* **Storage & Capacity Constraints**: Enforces storage space limits (MB) and employee count bounds.

---

## 4. Workflows & Process Flows (Mermaid Diagrams)

### A. New Tenant Onboarding & Schema Sync Flow
```mermaid
graph TD
    A[Start: Prospective Customer Submits Registration Form] --> B[Save Data in RegistrationRequest with PENDING Status]
    B --> C[Superadmin Reviews Request in Central Portal]
    C -->{Approved?}
    C -- No --> D[Set Status to REJECTED & Send Email Notice]
    C -- Yes --> E[Set Status to APPROVED & Generate Tenant Record]
    E --> F[System Automatically Generates PostgreSQL Schema & Syncs Migrations]
    F --> G[Generate Domain Subdomain Mapping]
    G --> H[Send Confirmation Email with Subdomain & Login Link]
    H --> I[End]
    D --> I
```

### B. Tenant Lifecycles & Grace Period Enforcement
```mermaid
graph TD
    A[Start: Client Performs HTTP Workspace Request] --> B[Middleware Detects Subdomain & Loads Tenant Profile]
    B --> C[Retrieve and Verify expiry_date]
    C -->{Current Date <= expiry_date?}
    C -- Yes --> D[Status = ACTIVE: Full Read/Write Access Granted]
    C -- No --> E{Is Current Date within Grace Period?}
    E -- Yes --> F[Status = EXPIRED: Read-Only Workspace Access]
    E -- No --> G[Status = SUSPENDED: Blocked Access Page Rendered]
    D --> H[End]
    F --> H
    G --> H
```

---

## 5. Module Integrations
* **Integration with `users` Module**: Assigns the first staff administrator to the newly created database schema. Enforces admin quotas (`max_admins`) defined by the tenant's package tier.
* **Integration with `billing` Module**: Activates purchase items when `SubscriptionInvoice` records are paid, extending `expiry_date` and adding `extra_employees` or `extra_storage_mb` capacities.
* **Integration with Operational Modules**: Feeds authorization hierarchies (`leave_approval_level`, etc.) to route approvals. The JKK rate variable is retrieved by the payroll engine to calculate employer insurance contributions.

---

## 6. Permissions & Security Control
* **Schema Segregation**: Managed at the database database abstraction level by the `TenantMiddleware`. SQL queries are dynamically scoped to the tenant's specific schema.
* **`tenant_manage_settings`**: Tenant administrator permission required to customize logos, brand colors, calculation factors, late penalty policies, and document routing rules.
