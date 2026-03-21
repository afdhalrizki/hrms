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

![Shift Management](./assets/shift_management.png)
![Reimbursement UI](./assets/reimbursement_ui.png)

## 🛠 Technical Reference for Developers
This frontend is built with scalability and premium UI as top priorities.

### Core Architecture
- **App Router**: Leveraging Server Components for data performance.
- **Unified Identity**: Hydrates state from `/api/users/me/` for multi-persona support (Admin vs ESS).
- **Glassmorphism System**: Standardized `backdrop-blur` and `transparent-border` tokens across all modules.
- **Type Safety**: 100% TypeScript coverage with shared schema definitions.

---
**Status**: 🏆 Premium Dashboard Baseline Established (March 21, 2026)
