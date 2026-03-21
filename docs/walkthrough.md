# Walkthrough: harikerja HRMS (Fullstack)

A premium HRMS ecosystem with a robust Multi-Tenant Backend and a glassmorphism Next.js 14 Frontend.

## 🖥️ Backend Infrastructure (Core)

The backend is built with Python 3.12 and Django, focusing on security, performance, and enterprise-grade multi-tenancy.

### Phase 1-10: Multi-Tenant Foundation
- **Architecture**: Schema-level isolation using `django-tenants`.
- **Identity**: Unified User-Employee model with JWT authentication.
- **Organization**: Hierarchical master data (Departments, Roles, Employee Records).

### Phase 56-61: Logic Hardening & Test Coverage
- **Payroll Engine**: Implementation of TER 2024 PPh 21, BPJS calculations, and dynamic PDF generation.
- **Biometric Attendance**: Geofencing and biometric validation logic for clock-ins.
- **Hardening**: Achieved **100% test pass rate** across 86 mission-critical scenarios (Attendance, Payroll, Appraisal).
- **Refactoring**: Standardized test directory structure ensuring modular scalability.

---

## ✨ Frontend Evolution (Web)

### Phase 1-3: UI Framework & Core Dashboard
- **Tech Stack**: Next.js 14, Tailwind CSS, Framer Motion.
- **Branding**: Implemented Glassmorphism UI patterns with dark-mode support.
- **Live Stream**: Connected Admin Dashboard to attendance logs via real-time stream.

![Signup Page](./assets/signup_page_premium_harikerja.png)
![Admin Dashboard](./assets/dashboard_preview.png)

### Phase 24-29: Admin Empowerment
- **Tenant Settings**: Halaman kustomisasi logo dan branding tenant.
- **Provisioning**: Integrated Employee creation with Hybrid RBAC permissions.
- **Secret Portal**: Professional login hidden for platform administrators (`/login/portal-admin`).

![Company Settings Form](./assets/company_settings_form_1773630472562.png)
![Settings Validation](./assets/tenant_settings_ui_validation_1773630453833.webp)
![Add Admin Employee Modal](./assets/add_employee_modal_before_submit_1773638661925.png)

### Phase 34-62: Advanced Workflows & Correction
- **Attendance**: Dashboard for geofencing status and audit visualization.
- **Approvals**: UI for multi-stage approval workflows (Leaves, Overtime).
- **Attendance Correction**: A dedicated workflow for employees to request time adjustments, with a "Comparison Queue" for admins to approve/reject changes.
- **Advanced Reporting (Analytics)**: A dynamic dashboard for Admins providing real-time headcount trends, attendance health, and payroll cost summaries with one-click CSV exports.

![Shift Management](./assets/shift_management.png)
### Phase 63: Self-Service Expansion (Leaves & Reimbursements)
- **Leaves**: Real-time balance tracking and modal submission for annual/sick leaves.
- **Reimbursements**: Category-based expense claims with file upload support for receipts.
- **Infrastructure**: Optimized `apiFetch` to handle `FormData` and multi-part uploads.

### Phase 64: Financial Command Center (Sync Payroll)
- **Live Sync**: Payroll dashboard now mirrors backend payslips in real-time.
- **Tax & BPJS Insight**: Detailed breakdown modal showing PPh 21 (TER 2024) and BPJS Kesehatan/Ketenagakerjaan.
- **Admin Power**: Dedicated modal for bulk payroll generation across specific periods.
- **PDF Generation**: Direct integration with backend `pdf_generator` for instant payslip downloads.

### Phase 65: Operational Clarity (Audit & API)
- **Audit Logs**: Interactive timeline of system changes with side-by-side diffing of field updates.
- **API Key Portal**: Robust management of third-party credentials with secure "show-once" generation logic.
- **Admin Visibility**: Hardened sidebar navigation to allow only authorized personnel to access system settings.

### Phase 66: Appraisal Lifecycle (KPI Finalization)
- **KPI Attainment Tracking**: Real-time progress bars and attainment calculation for individual Key Performance Indicators.
- **Multi-Role Reviews**: Dual-action appraisal system supporting both Self-Appraisal (Employee) and Manager Evaluations.
- **Weighted Scoring**: Multi-dimensional rating engine (Quality, Communication, Reliability, Teamwork) with automated average calculation.
- **History Viewer**: Consolidated view of all historical appraisal results with reviewer role identification.

### Phase 67: SaaS Branding (Master Identity)
- **Whitelabel Logic**: Full support for custom company logos and primary/secondary theme colors.
- **Dynamic Style Injection**: Implementation of real-time CSS variable injection, allowing the UI to adapt instantly to branding changes.
- **Branding Portal**: A dedicated settings workspace for administrators to manage their organization's visual identity.
- **Unified Identity**: Seamless propagation of branding assets across the Sidebar, Topbar, and interactive UI elements.

---

## 🛠️ Local Development Experience

To streamline development across the stack, we provide automated scripts for local setup.

### Backend Local Dev (`run_dev.ps1`)
Located in the `backend/` directory, this script automates the entire local stack:
1. **Container Orchestration**: Starts `db`, `redis`, and `pgbouncer`.
2. **Auto-Environment**: Maps `.env.local` and overrides hosts for native execution.
3. **Dependency Sync**: Manages Python `venv` and `pip install`.
4. **Data Sync**: Runs schema migrations for both shared and tenant data.

**Usage**:
```powershell
cd backend
.\run_dev.ps1
```

---
**Status**: 🏆 Fullstack Hardening (v1.1.0-Hardened) Complete (March 21, 2026)

