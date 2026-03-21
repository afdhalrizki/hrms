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

---
**Status**: 🏆 Self-Service Expansion (Phase 63) Complete (March 21, 2026)
