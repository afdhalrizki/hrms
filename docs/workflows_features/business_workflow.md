# Business Workflow & Billing Logic

This document details the operational workflow of the **harikerja HRMS** platform, from client registration to onboarding and billing mechanisms.

---

## 🏗️ 1. Registration & Tenant Activation Flow

The system follows a centralized **B2B SaaS** workflow to ensure each company (tenant) has an isolated database.

### Stage 1: Client Registration (Self-Service)
*   **Action**: Potential clients fill out the registration form on the landing page (Company Name, Subdomain Prefix, Admin Email).
*   **Process**: The `PublicSignupViewSet` API stores the data in the `RegistrationRequest` model with a `PENDING` status.
*   **Outcome**: The client receives an email confirmation that the request is under review.

### Stage 2: Initial Payment (Midtrans)
*   **Action**: Before approval, the client is directed to pay the first subscription fee based on their chosen plan.
*   **Process**: The Midtrans Snap integration generates a payment token. Once the payment is successful, the registration or associated invoice status is updated to `PAID`.
*   **Status**: Currently, payment is processed either before or during the approval process by the Global Admin.

### Stage 3: Approval & Provisioning
*   **Action**: The Global Admin reviews the request and clicks **Approve**.
*   **Automated Process**:
    1.  **Schema Creation**: The PostgreSQL database creates a new isolated schema for the company (e.g., `pt_maju_bersama`).
    2.  **Domain Mapping**: The subdomain (e.g., `maju.harikerja.com`) is registered.
    3.  **User Provisioning**: The Admin user account is created in the `public` schema and linked to the tenant.
    4.  **HR Base Init**: The system automatically generates basic master data (Management Department, Admin Role, Base Salary Grade) within the tenant schema to make the system ready for immediate use.

### Stage 4: Onboarding
*   **Action**: The company admin receives login credentials.
*   **Process**: The admin logs into the company's subdomain and starts inviting employees via the **Create Employee** feature.

---

## 💰 2. Billing Logic & Employee Quotas

The **harikerja** platform utilizes a **Tier-Based Pricing** model (Not Pay-per-Seat), where the price is fixed per plan but limited by resource quotas.

### Employee Quotas
Each plan has a maximum employee limit (`max_employees`):
*   **Essential**: Max 50 Employees.
*   **Professional**: Max 500 Employees.
*   **Premium**: Max 2,000 Employees.
*   **Enterprise**: Up to 10,000+ Employees.

### Quota Enforcement Mechanism
The system validates the employee count in real-time when an Admin attempts to add a new employee:
1.  **Count Check**: Before saving a new employee record, the system calls `Employee.objects.count()`.
2.  **Comparison**: If `Count >= max_employees` for the active plan, the API returns a `QUOTA_EXCEEDED` error (HTTP 403).
3.  **Upgrade**: The Admin must upgrade the plan (via the Billing Page) to increase the employee quota.

### Storage Quotas
*   The system exhaustively monitors the total size of all uploaded files (Reimbursements, Attendance photos, Leave attachments, KTP/NPWP scans).
*   **Isolation**: All files are isolated into tenant-specific physical folders (`media/<schema_name>/`) to ensure security and organizational clarity.
*   **Enforcement**: If total usage exceeds the `storage_limit_mb`, new file uploads are blocked, and administrators receive automated `CRITICAL` alerts.

---

## 📈 3. Subscription Status Summary

| Status | Description | API Access |
| :--- | :--- | :--- |
| **ACTIVE** | Payment is valid & active. | Full Access (Read/Write) |
| **EXPIRED** | Past due date (14-day Grace Period). | **Read-Only** (View Data Only) |
| **SUSPENDED** | Past grace period or TOS violation. | **Blocked** (Access Closed) |

---
> [!TIP]
> This workflow ensures platform scalability where each tenant's resources are automatically controlled by the integrated billing system.
