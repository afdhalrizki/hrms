# Ultra-Detailed Implementation Plan: Web Frontend reference

This document serves as the primary technical reference for building and maintaining the harikerja HRMS web frontend.

## 🏗 1. Component & Directory Architecture
To maintain a clean separation between Admin and Employee personas while sharing core logic:

```bash
src/
├── app/                  # Next.js App Router (Routing & Layouts)
│   ├── (admin)/         # Admin-only route group
│   ├── (ess)/           # Employee-only route group
│   └── auth/            # Shared auth pages (login/signup)
├── components/          # Reusable UI components
│   ├── ui/              # Atom components (Buttons, Inputs, Modals)
│   ├── admin/           # Admin-specific molecule components
│   ├── ess/             # Employee-specific molecule components
│   └── shared/          # Multi-persona components (Sidebar, Topbar)
├── context/             # Global State (AuthContext, TenantContext)
├── hooks/               # Custom React hooks (usePermissions, useTenant)
├── services/            # API Service Layer (Axios/Fetch instances)
└── utils/               # Formatting, Validation, and Helper functions
```

## 🚀 2. Phased Roadmap: Full Backend Parity

### Phase 63: ESS Expansion (Leaves & Reimbursements)
- **Leaves**: Request form + Balance tracker (`/api/attendance/leave-requests/`).
- **Reimbursements**: Receipt upload + Status tracking (`/api/reimbursement/reimbursements/`).

### Phase 64: Financial Command Center (Real-time Payroll)
- **Live Sync**: Connecting `PayrollPage` to `/api/payroll/payslips/`.
- **BPJS/Tax Insight**: Interactive breakdown of PPh 21 (TER 2024) and BPJS Kesehatan/Ketenagakerjaan.

### Phase 65: Operational Audit Hub (Admin Transparency)
- **Audit Logs**: Visual "Deep-diff" activity feed from `/api/core/audit/`.
- **API Keys**: UI for managing third-party integration keys.

### Phase 66: Performance Appraisal Lifecycle
- **Appraisal Workflow**: Submission Modal for managers to score KPIs and finalize reviews.

### Phase 67: SaaS Profile & Branding
- **Branding**: Tenant settings for company logo, colors, and subscription limits.

### Phase 68: E2E Hardening (Playwright)
- **Coverage Expansion**: Implementation of full-flow testing for Admin (Provisioning, Approvals) and Employee (ESS, Payslip download).
- **Automation**: Integration of Playwright into the CI/CD pipeline.

## 🎨 3. Design System: Glassmorphism Hub
We use a unified design language to ensure a "Premium SaaS" feel.

- **Background**: `bg-slate-950` with a subtle radial gradient.
- **Glass Effect**: `bg-white/5 backdrop-blur-xl border border-white/10`.
- **Primary Accent**: `bg-indigo-500` for buttons and active states.
- **Typography**: `Inter` (Inter-var) for maximum readability.
- **Animations**: `framer-motion` for page transitions and modal entries.

## 🔄 4. State Management & Data Fetching
- **Client State**: `React.useContext` for small, global data (User, Tenant).
- **Server State**: `TanStack Query` (React Query) for caching, optimistic updates, and automatic re-fetching of attendance/payroll data.
- **Form Management**: `react-hook-form` + `zod` for robust schema-based validation.

## 🚪 5. Security & Access Control
- **CSRF Protection**: Native Next.js CSRF guards + backend cookie validation.
- **Multi-Tenant Header**: Every outgoing request must include `X-Tenant-Domain` via the `api.ts` interceptor.
- **Role-Based Gating**:
    - Use `<RoleGuard roles={['HR', 'Admin']}>` for UI elements.
    - Use `middleware.ts` for route-level protection.

## 📊 6. Advanced Feature: Reporting Engine
- **Implementation**: The reporting dashboard uses `recharts` for visualization.
- **CSV Downloads**: Use a custom `useReport` hook that handles the `Blob` response from the backend and triggers a local file download.

## ✅ 7. Testing Philosophy
- **Unit Tests**: Focus on logic in `hooks/` and `utils/`.
- **Integration Tests**: Focus on critical flows like `Login`, `Signup`, and `Attendance Correction`.

## 🎭 8. E2E Testing Strategy: Playwright
We use Playwright for cross-browser validation of the most critical business flows.

- **Storage State**: Use a shared `auth.setup.ts` to reuse login sessions and speed up tests.
- **Geofencing Simulation**: Mocking browser geolocation API to test attendance validation.
- **Visual Regression**: Baseline screenshots for the premium Glassmorphism UI components.
- **Mocks**: Standardize API mocks using `msw` (Mock Service Worker) for consistent testing environment.
