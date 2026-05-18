# Module Documentation: Employee Reimbursement Claims

## 1. General Overview
The **Reimbursement** module allows employees to request refunds for business expenses incurred using their personal funds (e.g., travel expenses, client entertainment, medical bills, or equipment purchases). It automates expense category limits, tracks digital receipts, and routes requests through multi-level approvals before finance issues payments.

* **Target Users**: General Employees, Supervisors, Finance Teams, and HR Administrators.

---

## 2. Key Database Models
This module utilizes the following database models inside the `reimbursement` Django app:

1. **`ReimbursementCategory`**: Defines approved expense categories. Stores names (e.g., Travel, Health, Equipment), descriptions, and maximum claim limits per transaction (`max_amount`).
2. **`Reimbursement`**: Manages individual expense claims. Links to the employee file, captures transaction dates, claim amounts (`amount`), business contexts, receipt numbers, file uploads, stage tracking (`current_stage`), decisions (`PENDING`, `APPROVED`, `REJECTED`), finalized approved amounts (`approved_amount`), and finance review notes (`notes`).

---

## 3. Core Features & Capabilities
* **Automatic Category Plafonds**: Validates transaction inputs against defined category limits (`max_amount`) to prevent excessive claims.
* **Digital Receipt Auditing**: Requires employees to upload digital receipts, bills, or invoices to ensure financial compliance and prevent fraud.
* **Structured Approvals**: Routes claims through direct supervisors to verify business context, and finance teams to audit receipt authenticity.
* **Partial Amount Approvals**: Allows finance reviewers to approve a portion of the request (`approved_amount` < `amount`) if certain listed items are deemed non-eligible for business refund.

---

## 4. Workflows & Process Flows (Mermaid Diagrams)

### A. Reimbursement Submission & Payout Lifecycle
```mermaid
graph TD
    A[Start: Employee Fills Reimbursement Request] --> B[Enter Date, Category, Amount, & Receipt Number]
    B --> C[Upload Image / PDF Receipt]
    C --> D{Is Amount <= Category max_amount?}
    D -- No --> E[Display Error: Amount exceeds category limit] --> B
    D -- Ya --> F[Save Claim as PENDING & Trigger Workflow]
    F --> G[Stage 1: Direct Supervisor Review]
    G -->{Supervisor Approved?}
    G -- No --> H[Set Status to REJECTED & End]
    G -- Yes --> I[Stage 2: Finance Department Verification]
    I -->{Finance Approved & Receipt Audited?}
    I -- No --> H
    I -- Yes --> J[Specify approved_amount & Review Notes]
    J --> K[Set Status to APPROVED]
    K --> L[Queue Request for Payout / Bank Transfer]
    L --> M[End]
```

---

## 5. Module Integrations
* **Integration with `core` Module**: Pulls employee profiles (`Employee`), supervisor hierarchies, and utilizes dynamic multi-stage configurations (`WorkflowConfig` / `WorkflowStage`) for custom approval routings.
* **Integration with `tenants` Module**: Obeys tenant-wide authorization routing policies (`reimbursement_approval_level`) to determine whether both a supervisor and finance officer must sign off, or if one is sufficient.

---

## 6. Permissions & Security Control
* **`tenant_approve_reimbursement`**: Grants authorization to inspect employee claims, edit final approved amounts, append audit comments, and approve or reject submissions.
* **Receipt File Isolation**: Uploaded files are isolated per tenant schema within directories managed by `reimbursement_upload_path` to prevent information leaks of internal financial documents.
