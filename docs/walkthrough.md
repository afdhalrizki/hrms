# Walkthrough: harikerja HRMS (Fullstack & Mobile)

A premium, high-performance HRMS ecosystem with a robust Multi-Tenant Backend, a glassmorphism Next.js 14 Frontend, and a biometric-enabled Flutter Mobile app.

## 🖥️ Backend Infrastructure (Core)

Built with Python 3.12 and Django, focusing on security, performance, and enterprise-grade multi-tenancy.

### Phase 1-61: Logic Hardening & Test Coverage
- **Architecture**: Schema-level isolation using `django-tenants`.
- **Payroll Engine**: TER 2024 PPh 21 compliance and dynamic PDF payslips.
- **Biometric Attendance**: Geofencing and AI biometric validation logic.
- **Coverage**: **100% test pass rate** across 155+ mission-critical scenarios.

## ✨ Frontend Evolution (Web)

### Phase 24-65: Admin & Operational Clarity
- **Dashboard**: Modern glassmorphism UI with real-time analytics.
- **Workflow**: Multi-stage approvals for Leaves, Overtime, and Reimbursements.
- **Appraisal**: KPI-based performance tracking and multi-role evaluation lifecycle.
- **Audit Logs**: Interactive timeline of system changes with side-by-side diffing.

## 📱 Mobile ESS (Flutter)

### Phase M1-M6: Employee Hardening
- **Biometrics**: Face ID liveness detection using Google ML Kit.
- **Sync**: Real-time integration with backend Attendance, Profile, and Performance modules.
- **Testing**: 100% logic and E2E coverage hitting the real development server.

## 🌐 Platform Deployment Architecture (4-Tier)

The harikerja platform is architected for a seamless promotion path from local development to global enterprise scale:

| Tier | Domain | Hosting Provider | Purpose |
| :--- | :--- | :--- | :--- |
| **Development** | `localhost` | Local Docker | Rapid prototyping & regional local testing. |
| **QA** | `harilibur.web.id` | **IDCloudHost VPS** | Functional UAT and quality assurance testing. |
| **Staging** | `harikerja.web.id` | **Enterprise AWS** | 1M User stress testing (Identical to Production). |
| **Production** | `harikerja.com` | **Enterprise AWS** | Official high-availability enterprise workloads. |

### Infrastructure Synchronization
- **Automation**: Updated `up.ps1` and `Makefile` to allow one-click deployment to any tier.
- **Environment Management**: Unified `.env.qa`, `.env.staging`, and `.env.prod` configurations.
- **Mobile Integration**: Compiled-time environment switching via `--dart-define=APP_ENV=...`.

## 🛠️ Unified Automation Tools

- **Local Dev**: `.\run_dev.ps1` (Backend) maps environments and databases automatically.
- **Deployment**: `.\up.ps1 [dev|qa|staging|prod]` (Root) orchestrates the entire stack.
- **Testing**: Centralized `run_tests.ps1` scripts in each module for CI/CD integration.

---
**Status**: 🏆 **Enterprise SaaS Milestone v1.2.0-SaaS (March 26, 2026)**. All modules synchronized with 4-tier hierarchy.
