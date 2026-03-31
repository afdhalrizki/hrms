# harikerja HRMS SaaS

A next-generation, multi-tenant Human Resource Management System (HRMS) built for enterprise scale. This platform provides a comprehensive suite for HR management, attendance tracking with AI biometric verification, Indonesian payroll compliance (TER 2024), and Executive Analytics.

## ✨ Platform Highlights

### Professional Admin Dashboard
![Dashboard Preview](./docs/assets/dashboard_preview.png)
*Modern, glassmorphism-based command center for HR professionals.*

### Secure Mobile Attendance
<p align="center">
  <img src="./docs/assets/mobile_preview.png" width="45%" />
  <img src="./docs/assets/mobile_face_id.png" width="45%" />
</p>
*Biometric face verification and real-time ESS (Employee Self-Service) for modern workforces.*

## 📦 Getting Started

Unified scripts to manage **Development**, **Staging**, and **Production** environments seamlessly.

### Windows (PowerShell)
```powershell
.\up.ps1 dev -build
```

### Linux/macOS (Make)
```bash
make dev
```

**Access Points (Local Dev):**
- **Public Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Tenant Dashboard**: [http://company1.localhost:3000](http://company1.localhost:3000)
- **Backend API Docs**: [http://localhost:8000/api/schema/swagger-ui/](http://localhost:8000/api/schema/swagger-ui/)

## 📁 Project Modules

| Module | Purpose | Documentation |
| :--- | :--- | :--- |
| **Backend** | Django REST API & Multi-tenant Core | [**README**](./backend/README.md) |
| **Frontend** | Next.js Premium Admin Dashboard | [**README**](./frontend/README.md) |
| **Mobile** | Flutter Employee Self-Service App | [**README**](./mobile/README.md) |

## 🚀 Key Features

- **Multi-Tenant Foundation**: Complete data isolation using PostgreSQL schemas per customer.
- **Biometric Security**: AI-powered Face ID with liveness check using Google ML Kit.
- **Indonesian Payroll Compliance**: Fully compliant **TER 2024 PPh 21** and BPJS engine.
- **Strategic Performance**: KPI tracking, Appraisal lifecycle, and multi-stage approval workflows.
- **ESS Profile Management**: Self-service portal for employees to update personal info and upload documents.
- **Auto-Onboarding**: Commercial-ready self-service registration and schema provisioning.

## 🌐 Deployment & Infrastructure

| Tier | Domain | Hosting Platform | Purpose |
| :--- | :--- | :--- | :--- |
| **Dev** | `localhost` | Local Docker | Rapid prototyping & local testing. |
| **QA** | `qa.harikerja.web.id` | **IDCloudHost** | Functional UAT and QA testing. |
| **Staging** | `staging.harikerja.web.id` | **AWS Enterprise** | 1M User stress test. |
| **Production** | `harikerja.com` | **AWS Enterprise** | Official enterprise workloads. |

## 🧪 Testing Standard

The platform achieves a unified **100% test pass rate** across all layers of the stack.

- **Backend**: 168 Logic tests (Pytest).
- **Frontend**: 61 Unit tests (Vitest) + 25 E2E tests (Playwright).
- **Mobile**: 25 Logic tests verified against a live backend.

## 📚 Technical Documentation

For in-depth technical details, please refer to the platform-wide internal documentation:
- [**Implementation Plan**](./docs/implementation_plan.md)
- [**Walkthrough & Results**](./docs/walkthrough.md)
- [**Development Roadmap**](./docs/task.md)

## 🛠 Tech Stack

- **Backend**: Python 3.12+, Django 6.0, Django-Tenants, DRF.
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion.
- **Mobile**: Flutter 3.19+, Dart, Google ML Kit (Biometrics).
- **Infrastructure**: PostgreSQL 15, Redis 7, PgBouncer, AWS (EKS/RDS/S3).

---
**Status**: 🏆 **Platform Gold Release v1.2.0 (March 27, 2026)**. 100% Verified.

