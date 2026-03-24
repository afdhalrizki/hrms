# Master Task List: Web Frontend (harikerja HRMS)

This checklist tracks the implementation of the premium Next.js 14 dashboard and its integration with the backend API, divided by user persona.

## 🏢 1. Administrator & Manager Features
Features for managing the organization, data, and approvals.

- [x] **Executive Analytics**: Dynamic charts for headcount, salary costs, and late-check-in trends.
- [x] **Tenant Branding**: Configuration for company logo, colors, and workspace profile.
- [x] **Provisioning Hub**: Modal for creating employees and automated IAM provisioning.
- [x] **RBAC Management**: Assignment of roles and custom JSON permission masks.
- [x] **Secret Portal**: Professional manager-only login at `/login/portal-admin`.
- [x] **Advanced Reporting (Phase 61)**: Exportable monthly recaps (CSV/Excel) and appraisal summaries.
    - [x] Implementation of `TableExport` logic and analytics fetching.
    - [x] Interactive KPI attainment charts using dynamic data.
- [x] **Workflow Management (Phase 38/62)**: Unified inbox for approving Leaves, Overtime, and Attendance Corrections.
    - [x] "Comparison View" for attendance adjustments.
    - [x] Real-time notification badge on sidebar for pending approvals.
---
### 🌊 Full Backend Parity Phase (Next Steps)
- [x] **Phase 63: Self-Service Expansion**: Dedicated pages for Leave Requests and Reimbursements.
- [x] **Phase 64: Financial Core**: Live BPJS & PPh 21 calculation dashboards.
- [x] **Phase 65: Operational Clarity**: Admin Audit Logs viewer and API Key manager.
- [x] **Phase 66: Appraisal Lifecycle**: Full submission workflow for KPIs and reviews.
- [x] **Phase 67: Tenant Branding**: Admin settings for company logo and theme colors.
- [x] **Phase 68: E2E Hardening**: Comprehensive Playwright test suite for all modules.
- [x] **Phase 69: Modular Tiering**: Plan-based gating (Basic/Pro/Enterprise) management.
- [x] **Phase 70: ESS Profile Management**: Dedicated UI for updating personal data and documents.
- [x] **Phase 71: ESS Hardening & UX Optimization**: 100% unit test success, interactive charts, and zero-CLS skeletons.

## 👤 2. Employee Self-Service (ESS) Web Portal
Features for individual employees to manage their own data (Web-based ESS).

- [x] **Identity Hydration**: Personalized "Welcome" dashboard with real-time profile data.
- [x] **Attendance Live View**: Visualizing own daily check-in/out status.
- [x] **Historical Payslips**: Downloadable PDF payslips with TER 2024 compliance.
- [x] **Personal Profile Management**: Self-service interface for updating personal info and documents.
    - [x] Document upload module (KTP, NPWP, Avatar).
- [x] **Web Attendance Correction**: Request form for time adjustments (similar to Mobile Phase 2).
- [x] **Leave & Reimbursement Dashboard**: Monitoring own quotas and tracking claim status via web.
- [x] **Performance Review (Phase 45)**: Form for submitting self-appraisals and viewing targets.

## 🛠 3. Technical & Infrastructure Roadmap
- [x] **Node.js 22 Migration**: High-performance Debian-based runtime.
- [x] **Tailwind 4 Support**: Oxide engine integration for rapid UI styling.
- [x] **Vitest Coverage**: 100% logic coverage for multi-tenant and auth contexts.
- [x] **Localization**: Full ID/EN bilingual support.
- [x] **Performance Optimization**:
    - [x] Implement `AttendanceChart` for visualization.
    - [x] Zero-CLS (Cumulative Layout Shift) skeletons for dashboard widgets.
