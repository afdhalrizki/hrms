# Tasks: Web Frontend (harikerja HRMS)

This checklist tracks the implementation of the premium Next.js 14 dashboard and its integration with the backend API.

## Core UI & Layout
- [x] **Framework**: Initialize Next.js 14 project with App Router.
- [x] **Premium Aesthetics**: Implement glassmorphism design system using Tailwind CSS.
- [x] **Responsive Sidebar**: Navigation for HR, Attendance, Payroll, and Performance.
- [x] **Tenant Detection**: Automated subdomain parsing logic in `TenantContext`.

## Authentication & Identity
- [x] **Mobile-Sync Login**: Support for multi-tenant authentication.
- [x] **AuthContext**: Centralized state management for user identity.
- [x] **Identity Hydration**: Real-time profile data mapping (Fullname, NIK, Role).
- [x] **Secret Portal**: Hidden login route at `/login/portal-admin` for global managers.

## Operational Dashboards
- [x] **Attendance Live Stream**: Real-time view of daily clock-in/out activity.
- [x] **Executive Analytics**: Dynamic charts for salary costs, headcount, and attendance trends.
- [x] **Employee Provisioning**: Modal for creating employees with provisioning toggles (RBAC/User).
- [x] **Workflow Approvals**: UI for multi-stage approval lists (Leaves, Overtime, Reimbursements).
- [x] **Payroll Management**: Integrated payslip generator and historical data viewer.
- [x] **Performance UI**: KPI target management and Appraisal review workflows.

## Infrastructure & Testing
- [x] **Node.js 22 Migration**: Migration to Debian-based runtime for binary compatibility.
- [x] **Tailwind 4 Support**: Resolved native binding issues for high-performance builds.
- [x] **Vitest Coverage**: 100% logic coverage for critical helpers (`api.ts`, `TenantContext`, `AuthContext`).
- [x] **Localization**: Bilingual support (ID/EN) throughout the application.
