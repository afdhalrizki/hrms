# Master Task List: Web Frontend (harikerja HRMS)

This checklist tracks the implementation of the premium Next.js 14 dashboard and its integration with the backend API, divided by user persona.

## 🏢 1. Administrator & Manager Features
Features for managing the organization, data, and approvals.

- [x] **Executive Analytics**: Dynamic charts for headcount, salary costs, and late-check-in trends.
- [x] **Tenant Branding**: Configuration for company logo, colors, and workspace profile.
- [x] **Provisioning Hub**: Modal for creating employees and automated IAM provisioning.
- [x] **RBAC Management**: Assignment of roles and custom JSON permission masks.
- [x] **Secret Portal**: Professional manager-only login at `/login/portal-admin`.
- [ ] **Advanced Reporting (Phase 61)**: Exportable monthly recaps (CSV/Excel) and appraisal summaries.
    - [ ] Implementation of `TableExport` component with server-side pagination.
    - [ ] Interactive KPI attainment charts using `Recharts`.
- [ ] **Workflow Management (Phase 38/62)**: Unified inbox for approving Leaves, Overtime, and Attendance Corrections.
    - [ ] "Comparison View" for attendance adjustments.
    - [ ] Real-time notification badge on sidebar for pending approvals.
- [ ] **Modular Tiering**: Plan-based gating (Basic/Pro/Enterprise) management.

## 👤 2. Employee Self-Service (ESS) Web Portal
Features for individual employees to manage their own data (Web-based ESS).

- [x] **Identity Hydration**: Personalized "Welcome" dashboard with real-time profile data.
- [x] **Attendance Live View**: Visualizing own daily check-in/out status.
- [x] **Historical Payslips**: Downloadable PDF payslips with TER 2024 compliance.
- [ ] **Personal Profile Management**: Self-service interface for updating personal info and documents.
    - [ ] Document upload module (KTP, NPWP, Education Certificates).
- [ ] **Web Attendance Correction**: Request form for time adjustments (similar to Mobile Phase 2).
- [ ] **Leave & Reimbursement Dashboard**: Monitoring own quotas and tracking claim status via web.
- [ ] **Performance Review (Phase 45)**: Form for submitting self-appraisals and viewing targets.

## 🛠 3. Technical & Infrastructure Roadmap
- [x] **Node.js 22 Migration**: High-performance Debian-based runtime.
- [x] **Tailwind 4 Support**: Oxide engine integration for rapid UI styling.
- [x] **Vitest Coverage**: 100% logic coverage for multi-tenant and auth contexts.
- [x] **Localization**: Full ID/EN bilingual support.
- [ ] **Performance Optimization**:
    - [ ] Implement `next/dynamic` for heavy chart components.
    - [ ] Zero-CLS (Cumulative Layout Shift) skeletons for dashboard widgets.
