# Ultra-Detailed Implementation Plan: Global harikerja Platform

This document serves as the high-level technical blueprint and fulfillment record for the **harikerja HRMS** SaaS ecosystem.

## 🏗 1. Cross-Stack Architecture
The platform is designed as a unified ecosystem with a hardened core and specialized consumer edges.

- **Core (Backend)**: Django 6.0.3 multi-tenant engine with schema-level isolation using PostgreSQL schemas.
- **Web Edge (Frontend)**: Next.js 14 premium dashboard for HR professionals and administrators with glassmorphism UI.
- **Mobile Edge (ESS)**: Flutter application for employee-specific biometric attendance and personal management.

## 🛠 2. Centralized Technical Standards
- **Authentication**: Standardized `/api/auth/` namespace with JWT rotation for mobile and session support for web.
- **Multi-Tenancy**: Subdomain-based tenant identification (`tenant.domain.com`) across all platforms.
- **Tax Compliance**: Centralized TER 2024 PPh 21 engine serving all interfaces.
- **Biometics**: Unified Face ID reference tracking and liveness check metadata via Google ML Kit.

## 🌐 3. 4-Tier Promotion Strategy & Infrastructure

Standardized across all stacks to ensure reliable delivery from local dev to enterprise production.

| Tier | Purpose | Domain | Hosting Platform | Tools |
| :--- | :--- | :--- | :--- | :--- |
| **Dev** | Prototyping | `localhost` | Local Docker | `.\up.ps1 dev` |
| **QA** | Functional UAT | `qa.harikerja.web.id` | IDCloudHost VPS | `.\up.ps1 qa` |
| **Staging** | 1M Stress Test | `staging.harikerja.web.id` | AWS Enterprise | `.\up.ps1 staging`|
| **Prod** | Enterprise | `harikerja.com` | AWS Enterprise | `.\up.ps1 prod` |

### Detailed Global Infrastructure
- **Enterprise Stack (Staging/Prod)**: 
    - **Compute**: Managed Kubernetes (AWS EKS) for frontend and backend horizontal scaling.
    - **Database**: Managed Amazon RDS (PostgreSQL 15) with high-availability and schema-based multi-tenancy.
    - **Caching**: Amazon ElastiCache (Redis) for shared session management and asynchronous task queuing.
    - **Asset Storage**: Amazon S3 for secure document (KTP/NPWP) and payslip storage.

## ✅ 4. Platform Accomplishments (Fulfillment Summary)

### Full Feature Parity (DONE)
- Attendance, Leave, Reimbursement, Payroll, and Performance modules are fully dynamic and verified on Web and Mobile.

### 100% Test Verification (DONE)
- **Backend Logic**: 168+ mission-critical Pytest scenarios passed.
- **Frontend Logic**: 61 Vitest + 25 Playwright scenarios passed.
- **Mobile Logic**: 25 Logic tests passed against live backend.

### Documentation Standard (DONE)
- Standardized `README.md` and `docs/` structure (Implementation Plan, Task Roadmap, Walkthrough) implemented in Backend, Frontend, and Mobile modules.

**Final Status**: 🏆 **Platform Gold Standard v1.2.0 (March 27, 2026)**.

