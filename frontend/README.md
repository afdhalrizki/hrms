# harikerja HRMS SaaS Frontend (Next.js)

The premium, high-performance admin dashboard for the **harikerja HRMS** ecosystem. Built with Next.js 16 and TypeScript, following the latest App Router patterns for optimal SEO and user experience.

## ✨ High-End Features

- **Multi-Tenant Experience**: Automatic tenant detection via subdomain parsing and workspace branding.
- **Attendance Management**: Real-time tracking of employee check-ins, geofencing status, and correction requests.
- **Workflow & Approvals**: Multi-stage approval system for leaves, overtime, and reimbursements with configurable stages.
- **Payroll Processing**: Automated payslip generation with TER 2024 compliance and salary component management.
- **Performance Appraisals**: KPI-based performance tracking and review cycles for all organizational levels.
- **Provisioning & RBAC**: Granular role-based access control and branch-specific management for distributed teams.
- **Analytics Dashboard**: High-level executive insights into headcount, attendance trends, and payroll costs.
- **ESS Profile Management**: Self-service portal for employees to update personal info and upload documents (KTP/NPWP).
- **Modular Tiering & Gating**: Intelligent feature masking via `FeatureGuard` based on tenant subscription plans.
- **Secret Admin Portal**: Centralized registrar for managing tenant growth and system-wide configurations.

## 🖼 UI Previews

### Admin Dashboard
![Dashboard Preview](../docs/assets/dashboard_preview.png)

*Modern, glassmorphism-based dashboard with real-time analytics indicators.*

### Premium Signup
![Signup Preview](../docs/assets/signup_page_premium_harikerja.png)

*Seamless tenant onboarding with instant domain validation.*

### Admin Provisioning
![Provisioning Preview](../docs/assets/add_employee_modal_before_submit_1773638661925.png)

*Employee creation form integrated securely with organizational RBAC toggles.*

## 🛠 Tech Stack

- **Core**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS & Vanilla CSS (Design System)
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Testing**: Vitest & React Testing Library

## 📁 Key Components

- `src/app/`: File-based routing including Signup, Login, and Dashboard.
- `src/context/`: Tenant and Auth state management with **Module Gating**.
- `src/components/`: Reusable UI components including the new `FeatureGuard`.
- `src/lib/`: API client and utility helpers.

---

## 📦 Getting Started

### Install Dependencies
```bash
npm install
```

### 🚀 Running the Platform
```bash
npm run dev
```

**Verify Frontend**:
- **Public Portal**: [http://localhost:3000](http://localhost:3000)
- **Tenant Dashboard**: [http://company1.localhost:3000](http://company1.localhost:3000)

## 🌐 Deployment & Infrastructure

The harikerja platform follows a strict 4-tier promotion path:

| Tier | Domain | Hosting Provider | Purpose |
| :--- | :--- | :--- | :--- |
| **Dev** | `localhost` | Local Docker | Rapid prototyping & local testing. |
| **QA** | `harikerja.web.id` | **Biznet / IDCH / Hostinger** | Functional UAT and QA testing. |
| **Staging** | `harikerja.my.id` | **Biznet / Bare-Metal** | 100K User scaling test. |
| **Production** | `harikerja.com` | **Biznet (100K) / AWS (1M)** | Official enterprise workloads. |

## 🧪 Testing Standard

The frontend uses a dual-layer strategy with **100% pass rate** across **268 mission-critical tests**.

### Unit Testing (Vitest) - 206 Tests
```bash
node scripts/run_unit_tests.mjs
```

### End-to-End Testing (Playwright) - 62 Tests

**Run with mocked API (Fast/Isolated):**
```bash
node scripts/run_e2e_tests.mjs
```

**Run with real integrated API and Database:**
```bash
node scripts/run_e2e_tests.mjs --integrated
```

### Run All Tests (Unit + E2E)
```bash
node scripts/run_tests.mjs
```

## 📚 Technical Documentation

For in-depth technical details, please refer to the platform-wide documentation in the root `docs/` directory:
- [**Architecture Guides**](../docs/architecture/)
- [**Business Strategy**](../docs/business_strategy/)
- [**Workflows & Features**](../docs/workflows_features/)
- [**Technical Specifications**](../docs/technical_specs/)

---
**Status**: 🏆 **Platform Gold Release v1.3.1 (May 11, 2026)**. Scalability Blueprint & Frontend Experience Standardized.
**Branding Note**: This project was rebranded to **harikerja** on March 16, 2026.

