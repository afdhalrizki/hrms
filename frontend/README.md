# harikerja HRMS SaaS Frontend (Next.js)

The premium, high-performance admin dashboard for the **harikerja HRMS** ecosystem. Built with Next.js 14 and TypeScript, following the latest App Router patterns for optimal SEO and user experience.

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
![Dashboard Preview](./docs/assets/dashboard_preview.png)
*Modern, glassmorphism-based dashboard with real-time analytics indicators.*

### Premium Signup
![Signup Preview](./docs/assets/signup_page_premium_harikerja.png)
*Seamless tenant onboarding with instant domain validation.*

### Admin Provisioning
![Provisioning Preview](./docs/assets/add_employee_modal_before_submit_1773638661925.png)
*Employee creation form integrated securely with organizational RBAC toggles.*

## 🛠 Tech Stack

- **Core**: Next.js 14 (App Router)
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

## 1. Setup & Installation

### Install Dependencies
```bash
cd frontend
npm install
```

### Development
```bash
npm run dev
```

**Verify Frontend**:
- **Public Portal**: [http://localhost:3000](http://localhost:3000) (For signup/login)
- **Tenant Dashboard**: [http://company1.localhost:3000](http://company1.localhost:3000) (For HR operations)

> [!IMPORTANT]
> To access tenant subdomains locally (e.g., `company1.localhost`), ensure your `hosts` file is configured correctly.

---

## 🌐 5. Deployment Hierarchy & Infrastructure

The harikerja platform follows a strict 4-tier promotion path:

| Tier | Domain | Hosting Provider | Purpose |
| :--- | :--- | :--- | :--- |
| **Dev** | `localhost` | Local Docker | Rapid prototyping & local testing. |
| **QA** | `harilibur.web.id` | **IDCloudHost** | Functional UAT and QA testing. |
| **Staging** | `harikerja.web.id` | **AWS Enterprise** | 1M User stress test (Identical to Production). |
| **Production** | `harikerja.com` | **AWS Enterprise** | Official high-availability enterprise workloads. |

### Local Multi-Tenancy Setup
To test tenant-specific dashboards locally (e.g., `company1`), update your OS `hosts` file:
```text
127.0.0.1 company1.localhost
```
Then access [http://company1.localhost:3000](http://company1.localhost:3000).

---

## 3. Testing Infrastructure

The frontend uses a professional, dual-layer testing strategy to ensure 100% reliability across critical HRMS workflows.

### 🧪 Unit Testing (Vitest)
Comprehensive logic and component verification using **Vitest** and **React Testing Library**.
- **100% Pass Rate**: 18 spec files (61 tests) covering Auth, Tenant, ESS Profile, and individual modules.
- **Automation**: Use the one-click script for dependency checks and coverage:
  ```powershell
  .\run_tests.ps1
  ```

### 🎭 End-to-End Testing (Playwright)
Functional verification of full user journeys (Attendance, Payroll, Performance, Reimbursements, Profile, Workflows, Analytics).
- **100% Pass Rate**: 12 spec files (21 tests) validated on Chromium, achieving zero flakiness.
- **Same-Origin Mocking**: Tests run on port 3000 to bypass CORS complexity and ensure high-fidelity request interception.
- **Automation**: Use the centralized automation script:
  ```powershell
  .\run_e2e.ps1
  ```

---

## 4. UI/UX Excellence (Phase 71)
- **Interactive Analytics**: Dashboard includes `AttendanceChart` for real-time visualization of work patterns.
- **Zero-CLS Rendering**: Systematic use of `Skeleton` loaders across Home and Performance modules.

---

## 5. Troubleshooting
- **Failed to Fetch**: Ensure `NEXT_PUBLIC_API_PORT=3000` is set in `.env.local` to match the Playwright mocking origin.
- **Subdomain Resolution**: Add `company1.localhost` and `company2.localhost` to your OS `hosts` file for local multi-tenant testing.


---

## 📚 Technical Documentation

For in-depth technical details, please refer to the internal documentation:
- [**Implementation Plan**](./docs/implementation_plan.md)
- [**Walkthrough & Results**](./docs/walkthrough.md)
- [**Development Roadmap**](./docs/task.md)

---
**Status**: 🏆 **ESS Frontend Hardening & UX Optimization (March 24, 2026)**
**Branding Note**: This project was rebranded to **harikerja** on March 16, 2026.
