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

## 🎯 IMMEDIATE PRIORITIES (Current Focus)

The platform has achieved **Platform Gold Release v1.3.0** and is now focusing on **Production Readiness** and **Performance Optimization**:

### 🔥 High Priority Tasks (Next 8-12 weeks)
1. **Production Monitoring & Observability**
   - Prometheus + Grafana for real-time monitoring
   - ELK Stack for centralized logging
   - AWS CloudWatch alerting

2. **Security Hardening**
   - Rate limiting for API endpoints
   - AWS WAF configuration
   - Secret management with AWS Secrets Manager
   - Comprehensive security audit

3. **Database Performance Optimization**
   - PostgreSQL query optimization and indexing
   - Database partitioning for large tables
   - PgBouncer connection pooling optimization

4. **CI/CD Pipeline Enhancement**
   - GitHub Actions automated pipeline
   - Canary deployment strategy
   - Infrastructure as Code with Terraform

### 📋 Detailed Implementation Plan
For complete details on immediate priorities, see: [**Immediate Priorities**](./docs/immediate_priorities.md)

## 📈 Scalability Strategy: Road to 1 Million Users

As **harikerja** transitions from a solo-developed MVP to a mission-critical enterprise platform, we have established a clear technical organization roadmap to ensure 99.9% uptime and data integrity for 1 million users.

### Technical Team Organization
To guarantee stability, we have defined a **10-person core team** structure:
- **Development (4 People)**: 2 Backend (Django), 1 Frontend (Next.js), 1 Mobile (Flutter).
- **Platform & Reliability (2 People)**: 1 DevOps/SRE, 1 Security Engineer.
- **Quality & Ops (4 People)**: 1 QA Automation, 3 Technical Support/Implementation.

### Strategic Transition Phases
1.  **Current Phase**: Production Readiness & Performance Optimization (8-12 weeks)
2.  **Next Phase**: 1,000 - 10,000 User Scaling with enhanced monitoring
3.  **Future Phase**: 100,000+ User scaling with full 10-person team deployment

Detailed scaling strategy: [**Technical Team Strategy**](./docs/plans/technical_team_strategy.md)

## 📚 Technical Documentation

For in-depth technical details, please refer to the platform-wide internal documentation:
- [**Immediate Priorities**](./docs/immediate_priorities.md) - Current focus areas
- [**Implementation Plan**](./docs/implementation_plan.md) - Overall architecture blueprint
- [**Walkthrough & Results**](./docs/walkthrough.md) - Feature stability summaries
- [**Development Roadmap**](./docs/task.md) - Phase-by-phase completion records
- [**AWS High Availability Architecture**](./docs/aws_high_availability_architecture.md) - 1M user scaling design

## 🛠 Tech Stack

- **Backend**: Python 3.12+, Django 6.0, Django-Tenants, DRF.
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion.
- **Mobile**: Flutter 3.19+, Dart, Google ML Kit (Biometrics).
- **Infrastructure**: PostgreSQL 15, Redis 7, PgBouncer, AWS (EKS/RDS/S3).

---
**Status**: 🚀 **Platform Gold Release v1.3.0 (March 31, 2026)**. Ready for Production Readiness Phase.
**Current Focus**: High Priority Performance Optimization & Security Hardening (Phase P5).

