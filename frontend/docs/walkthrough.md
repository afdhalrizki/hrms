# Walkthrough: Web Frontend (harikerja HRMS)

A premium Next.js 14 dashboard with glassmorphism UI, focused on real-time HR management and executive analytics.

## ✨ Feature Evolution

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

### Phase 68: E2E Hardening (Automated Assurance)
- **Attendance Spec**: Standardized end-to-end check-in/out flow for remote and office employees.
- **Financial Spec**: Validated bulk payroll generation and individual payslip visualization.
- **Appraisal Spec**: Verified manager review submission and real-time dashboard score hydration.
- **Branding Spec**: Confirmed persistence of custom corporate identity across the entire multi-tenant perimeter.

### Phase 70: ESS Profile Management (Self-Service)
- **Restricted Updates**: Employees can now update their own phone number, address, and PTKP status without admin intervention.
- **Document Management**: Added UI for secure upload and visualization of KTP and NPWP documents.
- **Field Protection**: Hardened the UI to ensure administrative fields like NIK and Department remain read-only for employees.
- **Unit Testing**: Implemented 100% test coverage for profile loading and update scenarios.

### Phase 71: ESS Hardening & UX Optimization (March 24, 2026)
- **Interactive Analytics**: Added `AttendanceChart` to the ESS dashboard for real-time visualization.
- **Zero-CLS Skeletons**: Systematic use of `Skeleton` loaders across Home and Performance modules.
- **Null-Safety pass**: Hardened `PerformancePage` and `ReimbursementsPage` to prevent runtime crashes during async state transitions.
- **Unit Test Expansion**: Achieved 100% test success across 18 spec files (61 tests).
- **Automation**: Updated `run_tests.ps1` for reliable local execution.

---
**Status**: 🏆 ESS Hardening & UX Optimization (Phase 71) Complete (March 24, 2026)
