# Harikerja Automation Logic & Strategy

This document provides a comprehensive overview of automation within the harikerja HRMS, covering both DevOps orchestration and core business logic automation.

---

## 1. DevOps & Environment Orchestration
The project uses a unified script system to ensure cross-platform compatibility for all developers.

### Orchestration Philosophy
- **`*.mjs` (JavaScript/Node.js)**: The **Source of Truth**. A unified script system designed for Linux, macOS, and Windows to ensure consistency across all environments.

### Key Automated Tasks
- **Smart Dependency Checking**: Uses `.venv_requirements.hash` to skip redundant `pip install` or `npm install`.
- **Automatic Health Checks**: Scripts wait for the backend/frontend to be reachable (HTTP 200/404) before starting tests.
- **Automatic Cleanup**: Hanging processes on ports 8000 and 3000 are automatically identified and killed before new sessions start.
- **Integrated Seeding**: Parallel test workers (`up.mjs --workers=N`) automatically provision isolated tenant databases and seed required test data.

---

## 2. Attendance & Geofencing Automation
Attendance processing is handled by the `AttendanceService` to ensure consistency across Web and Mobile.

### Automatic Status Calculation
- **Geofencing**: Uses the Haversine formula to calculate distance between user GPS and branch coordinates. If outside the allowed radius, status is automatically set to `OFF_SITE`.
- **Shift Mapping**: Compares `check_in_time` against assigned `Schedule` or default `Shift`.
    - `PRESENT`: Within geofence and on-time.
    - `LATE`: Within geofence but after shift start time (for non-flexible shifts).
    - `OFF_SITE`: Outside branch radius.
- **Leave Conflict Detection**: Automatically blocks clock-in if an `APPROVED` leave request exists for the current date.

---

## 3. Workflow & Approval Engine
Business requests (Leaves, Reimbursements, Corrections) follow a rule-based automated workflow.

### Stages and Transitions
1. **Initialization**: When a request is created, `WorkflowService.initialize_workflow` identifies the correct `WorkflowConfig` and sets the `current_stage` to sequence 1.
2. **Approver Identification**: Approvers are dynamically determined based on the stage configuration:
    - `SUPERVISOR`: Approver is the direct supervisor of the requesting employee.
    - `EMPLOYEE`: Approver is a specific employee ID designated for that stage.
3. **Multi-Stage Processing**: Requests move through sequences (1 → 2 → N) upon `APPROVED` actions.
4. **Admin Bypass**: If a Tenant Admin (with `manage_settings`) approves a request, subsequent stages are bypassed, and the request is immediately finalized.
5. **Finalization**: When the last stage is approved, the status moves to `APPROVED`, and secondary automation is triggered (e.g., deducting leave balance or updating attendance logs).

---

## 4. Operational Enforcement
### Quota & Plan Enforcement
- **Employee Quotas**: The system automatically counts active employees and blocks `POST /api/employees/` if the plan capacity (Base + Purchased) is exceeded.
- **Storage Management**: Biometric photos are automatically "skipped" if the tenant's storage capacity is full, allowing clock-in to proceed without attachments.
- **Platform Policy**: Organizations can enforce a `MOBILE_ONLY` clock-in policy, which automatically rejects web-based attendance requests.

### Data Anonymization
- **Audit Logs**: Changes are automatically tracked via `AuditModelMixin`, but PII data is masked in logs to ensure compliance with privacy standards.

---

**Last Updated**: April 28, 2026  
**Related Files**: `backend/attendance/services.py`, `backend/core/services.py`, `up.mjs`
