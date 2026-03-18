# harikerja HRMS SaaS

A next-generation, multi-tenant Human Resource Management System (HRMS) built for enterprise scale. This platform provides a comprehensive suite for HR management, attendance tracking with AI biometric verification, Indonesian payroll compliance (TER 2024), and Executive Analytics.

## ✨ Platform Highlights

### Professional Admin Dashboard
![Dashboard Preview](./docs/assets/dashboard_preview.png)
*Modern, glassmorphism-based command center for HR professionals.*

### Secure Mobile Attendance
<p align="center">
  <img src="./docs/assets/mobile_dashboard.png" width="45%" />
  <img src="./docs/assets/mobile_face_id.png" width="45%" />
</p>
*Biometric face verification and real-time shift management for employees.*

---

## 🚀 Quick Start

Unified scripts to manage **Development**, **Staging**, and **Production** environments seamlessly.

### Windows (PowerShell)
```powershell
# Format: .\up.ps1 [dev|staging|prod] [flags]
.\up.ps1 dev -build    # Start local dev
.\up.ps1 staging       # Start staging
.\up.ps1 prod -logs    # Start production and tail logs
.\up.ps1 dev -down     # Stop local dev
```

### Linux/macOS (Make)
```bash
make dev               # Start local dev
make staging           # Start staging
make prod              # Start production
make down              # Stop containers
```

**Access Points (Local):**
- **Public Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Tenant Dashboard**: [http://company1.localhost:3000](http://company1.localhost:3000)
- **Backend API Docs**: [http://localhost:8000/api/schema/swagger-ui/](http://localhost:8000/api/schema/swagger-ui/)

> [!NOTE]
> For detailed deployment instructions to **IDCloudHost** (Staging) or **AWS** (Production), see the [**Deployment Guide**](./deployment/README.md).

---

## 📁 Project Modules

| Module | Purpose | Documentation |
| :--- | :--- | :--- |
| **Backend** | Django REST API & Multi-tenant Core | [**README**](./backend/README.md) |
| **Frontend** | Next.js Premium Admin Dashboard | [**README**](./frontend/README.md) |
| **Mobile** | Flutter Employee Self-Service App | [**README**](./mobile/README.md) |
| **Docs** | Architecture & Project History | [**Walkthrough**](./docs/walkthrough.md) |

---

## 💎 Premium Features

- **Multi-Tenant Foundation**: Complete data isolation using PostgreSQL schemas per customer.
- **Tenant Customization**: Administrators can securely upload custom company logos and contact details dynamically mapped across the UI.
- **Biometric Security**: AI-powered Face ID with liveness check using Google ML Kit.
- **Admin Provisioning**: Centralized creation logic mapping employees instantly to global User accounts with optional Tenant Admin rights (Limited to 5 per company by default).
- **Dynamic Approvals**: Multi-stage approval workflows for Leave and Overtime, allowing per-tenant customization (Supervisor, HR, or Both).
- **Payroll Engine**: Fully compliant Indonesian PPh 21 (TER 2024), BPJS calculation engine, and automated overtime compensation integration.
- **Auto-Onboarding**: Commercial-ready self-service registration and provisioning workflow.
- **Analytics**: High-performance executive dashboards with real-time HR metrics.

## 🌐 Deployment Environments

The platform is architected for seamless transition from dev to enterprise scale:

| Environment | Hosting Platform | Purpose |
| :--- | :--- | :--- |
| **Development** | Local Docker | Rapid prototyping & local testing. |
| **Staging** | **IDCloudHost VPS** | UAT, QA, and early-stage production. |
| **Production** | **Modern AWS** | High-availability, auto-scaling enterprise workloads. |

---

## 🛠 Tech Stack

- **Backend**: Python 3.12, Django 5.0, Django-Tenants, DRF Spectacular.
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Framer Motion, Vitest.
- **Mobile**: Flutter 3.19+, Dart, Google ML Kit, Secure Storage.
- **Infrastructure**: PostgreSQL, Redis, PgBouncer, Docker Compose (Local), AWS EKS/RDS (Prod).

---
**Status**: Milestone 🎉 Phase 40 (Tenant Admin Limits) 100% Complete. Rebranded to **harikerja** on March 18, 2026.
