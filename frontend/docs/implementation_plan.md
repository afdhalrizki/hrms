# Ultra-Detailed Implementation Plan: Frontend (Next.js)

This document serves as the technical blueprint and record of accomplishment for the **harikerja HRMS** Next.js dashboard.

## 🏗 1. Next.js 16 Architecture
The frontend leverages the latest App Router patterns for maximum performance and SEO.

- **Routing & Layouts**:
    - `src/app/auth/`: Centralized login/signup with tenant validation.
    - `src/app/(dashboard)/`: Unified layout for HR operations with dynamic sidebar and top-nav.
- **Context & State Management**:
    - `AuthContext`: Manages JWT persistence (localStorage) and session life-cycle.
    - `TenantContext`: Handles subdomain parsing and branding extraction.
- **Shared Components**:
    - `src/components/ui/`: Atomic design system components (Glassmorphism).
    - `src/components/shared/FeatureGuard.tsx`: Security layer for Tier-based feature masking (Basic/Pro/Ent).

## 🛠 2. Technical Stack & Standards
- **Framework**: Next.js 16 (App Router) + TypeScript.
- **Styling**: Tailwind CSS + Vanilla CSS Modules for granular control.
- **Animations**: Framer Motion for premium micro-interactions.
- **Testing**: Vitest for units, Playwright for E2E user journeys.

## 🌐 3. Deployment Architecture (4-Tier)

The frontend is synchronized with the harikerja 4-tier environment hierarchy:

| Tier | Purpose | Domain | Hosting | Deploy Command |
| :--- | :--- | :--- | :--- | :--- |
| **Dev** | Prototyping | `localhost` | Local Docker | `npm run dev` |
| **QA** | Functional UAT | `qa.harikerja.web.id` | IDCloudHost VPS | `make qa` |
| **Staging** | 1M Stress Test | `staging.harikerja.web.id` | AWS Enterprise | `make staging` |
| **Prod** | Enterprise | `harikerja.com` | AWS Enterprise | `make prod` |

### Environment Isolation
The frontend uses `environments/.env.*` templates to determine:
- `NEXT_PUBLIC_API_URL`: Directs requests to the correct tier API.
- `NEXT_PUBLIC_DOMAIN_SUFFIX`: Ensures cookies and tenant routing match the domain (e.g., `.harikerja.com`).

## 🧩 4. Core ESS & Admin Features

### Multi-Tenant Personalization
- **Dynamic Branding**: Automated fetching of tenant logos and color schemes from backend settings.
- **Subdomain Routing**: Support for `tenant1.localhost:3000` isolation.

### Integrated Employee Self-Service (ESS)
- **Attendance**: Real-time visualization of geofences and clock-in/out transitions.
- **Performance**: High-fidelity KPI progress charts and interactive self-appraisal reviews.
- **Payroll**: TER 2024 tax compliance visualization and payslip history.

### Workflow Automation
- **Approve/Reject**: Multi-stage approval cycles for Overtime, Leave, and Reimbursement requests.
- **Audit Logs**: Visual history of actions across all organizational levels with diff previews.

## ✅ 5. Roadmap Completion Summary

### Phase F1: Foundation & UI Archetype (DONE)
- Next.js 16 setup and Glassmorphism design tokens.
- Cross-origin configuration and tenant mapping.

### Phase F2: Authentication & JWT Hardening (DONE)
- JWT persistence logic and transparent 401 retry interceptors.
- Secure login/logout flows and user profile linking.

### Phase F3: ESS Module Parity (DONE)
- Integration of Attendance, Payroll, Performance, and Leave modules.
- Multi-tenant data isolation and branding support.

### Phase F4: Quality Assurance & E2E (DONE)
- 100% Pass Rate for Vitest (Unit) and Playwright (E2E).
- Hardened Playwright configuration for zero-flakiness testing.

**Status**: ✅ **COMPLETED**. The frontend dashboard is fully hardened and synchronized.

