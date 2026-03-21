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

- **Core**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS & Vanilla CSS (Design System)
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Testing**: Vitest & React Testing Library

## 📁 Key Components

- `src/app/`: File-based routing including Signup, Login, and Dashboard.
- `src/context/`: Tenant and Auth state management.
- `src/components/`: Reusable UI components (Sidebar, Charts, Cards).
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
Open [http://localhost:3000](http://localhost:3000) for the public portal.

---

## 2. Multi-Tenant Development

To test tenant-specific dashboards (e.g., `company1`), update your local `hosts` file:
```text
127.0.0.1 company1.harikerja.com
```
Then access [http://company1.harikerja.com:3000](http://company1.harikerja.com:3000).

---

## 3. Testing

Verify core logic and UI components:
```bash
npm test
```
**Coverage**: 100% logic coverage for critical helpers (`api.ts`, `TenantContext.tsx`, `AuthContext.tsx`).

---
**Branding Note**: This project was rebranded to **harikerja** on March 16, 2026.
