# Ultra-Detailed Implementation Plan: Frontend (Next.js) reference

This document serves as the technical blueprint for the **harikerja HRMS** Next.js dashboard.

## 🏗 1. Architecture Patterns
- **Framework**: Next.js 14 (App Router).
- **State Management**: React Context for Auth and Tenant synchronization.
- **Styling**: Tailwind CSS with a custom glassmorphism design system.
- **Module Gating**: `FeatureGuard` component to mask features based on tenant tier.

## 🌐 2. Deployment Architecture (4-Tier)

The frontend is synchronized with the harikerja 4-tier environment hierarchy:

| Tier | Purpose | Domain | Hosting | Deploy Command |
| :--- | :--- | :--- | :--- | :--- |
| **Dev** | Prototyping | `localhost` | Docker | `npm run dev` |
| **QA** | Functional UAT | `harilibur.web.id` | IDCloudHost | `make qa` |
| **Staging** | 1M Stress Test | `harikerja.web.id` | AWS | `make staging` |
| **Prod** | Enterprise | `harikerja.com` | AWS | `make prod` |

### Environment Isolation
The frontend uses `environments/.env.*` to determine the `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_DOMAIN_SUFFIX`.

## 🧩 3. Core ESS Features
- **Attendance**: Real-time clock-in visualization and correction request workflows.
- **Payroll**: TER 2024 compliant payslip viewing and salary history.
- **Performance**: KPI dashboards and interactive self-appraisal forms.
- **SaaS Branding**: Dynamic logo and theme extraction from tenant settings.

## 🚀 4. Lifecycle & Delivery
- **Testing**: Vitest for units, Playwright for E2E user journeys.
- **Vercel/AWS**: Automated CD pipelines via GitHub Actions.
