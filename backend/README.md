# harikerja HRMS SaaS Backend (Django)

The mission-critical API core of the **harikerja HRMS** ecosystem. Built with Python 3.12 and Django, this backend employs a robust multi-tenant architecture with schema-level isolation to ensure maximum security and performance for enterprise clients.

## 🚀 Key Features

- **Multi-Tenant Foundation**: Complete data isolation using `django-tenants` and PostgreSQL schemas.
- **Auto-Onboarding Flow**: Public registration request system with an internal admin approval workflow that auto-provisions tenants.
- **Unified Identity (Admin-Employee)**: Integrated user profile API (`/api/users/me/`) that links Django users with their HR employee records.
- **Indonesian Payroll Engine**: Full compliance with **TER 2024 PPh 21** regulations, BPJS calculations, and dynamic PDF payslip generation.
- **Biometric Attendance**: Geofencing-validated clock-in/out with face reference tracking and liveness check metadata.
- **Comprehensive Reporting**: Standardized CSV/PDF exports for Attendance recaps, Appraisal summaries, and Payroll data.
- [x] **Strategic HR**: KPI tracking, Appraisal lifecycle, and multi-stage approval workflows.
- [x] **ESS Profile Management**: Restricted self-service API allowing employees to update personal contact info and upload KTP/NPWP documents without compromising HR master data.
- [x] **SaaS Tiering & Gating**: Model-level logic for plan-based feature enabling (Essential, Professional, Premium, Enterprise).
  
  | Feature | **FREE** | **ESSENTIAL** | **PROFESSIONAL** | **PREMIUM** | **ENTERPRISE** |
  | :--- | :---: | :---: | :---: | :---: | :---: |
  | **Quota** | 10 Emp | 50 Emp | 100 Emp | 500 Emp | 2,000+ |
  | **Payroll** | ❌ | ❌ | ✅ | ✅ | ✅ |
  | **Performance**| ❌ | ❌ | ❌ | ✅ | ✅ |
  | **Analytics** | ❌ | ❌ | ❌ | ❌ | ✅ |
- [x] **Cloud-Native Storage**: Ready for Amazon S3 or AWS-compatible storage via `django-storages` for multi-node scalability.

## 📁 Core Modules

- `tenants/`: Manages customer registration, domain routing, schema migrations, and **Modular Tiering**.
- `users/`: Centralized authentication and identity management.
- `core/`: Basic HR master data (Departments, Roles, Employee Records) and **Audit Logs**.
- `attendance/`: Scheduling, Geofencing, and Biometric attendance logs.
- `payroll/`: Salary components, TER 2024 tax engine, and payslip management.
- `performance/`: KPI strategy tracking and Appraisal lifecycles.
- `reimbursement/`: Multi-stage approval for expense claims.

## 🛠 Prerequisites

- **Python**: 3.12+
- **PostgreSQL**: 14+ (Required for schema support)
- **Redis**: For caching and background jobs (optional for local dev)

---

## 📦 Getting Started

### 1. Setup & Installation
```bash
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Database Initialization
The system uses a two-step migration process for multi-tenancy:
```bash
python manage.py migrate_schemas --shared
python manage.py migrate_schemas --tenant
python manage.py bootstrap_tenants
```

## 🚀 Running the Platform

### Start Development Server
```bash
node scripts/run_dev.mjs
```

**Verify Backend**:
- **API Status**: [http://localhost:8000/api/users/me/](http://localhost:8000/api/users/me/)
- **Swagger Docs**: [http://localhost:8000/api/schema/swagger-ui/](http://localhost:8000/api/schema/swagger-ui/)

## 🌐 Deployment & Infrastructure

The harikerja platform follows a strict 4-tier promotion path:

| Tier | Domain | Hosting Provider | Purpose |
| :--- | :--- | :--- | :--- |
| **Dev** | `localhost` | Local Docker | Rapid prototyping & local testing. |
| **QA** | `harikerja.web.id` | **Biznet / IDCH / Hostinger** | Functional UAT and QA testing. |
| **Staging** | `harikerja.my.id` | **Biznet / Bare-Metal** | 100K User scaling test. |
| **Production** | `harikerja.com` | **Biznet (100K) / AWS (1M)** | Official enterprise workloads. |

## 🧪 Testing Standard

The backend uses `pytest` with **100% pass rate** across **348 mission-critical tests** (329 Unit + 19 E2E).

**Run logic/unit tests:**
```bash
node scripts/run_unit_tests.mjs
```

**Run E2E tests:**
```bash
node scripts/run_e2e_tests.mjs
```

**Run All Tests (Unit + E2E):**
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
**Project Status**: 🏆 **Platform Gold Release v1.3.1 (May 11, 2026)**. Scalability Blueprint & Backend Core Standardized.
**Branding Note**: This project was rebranded from Antigravity to **harikerja** on March 16, 2026.

