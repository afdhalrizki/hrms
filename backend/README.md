# harikerja HRMS SaaS Backend (Django)

The mission-critical API core of the **harikerja HRMS** ecosystem. Built with Python 3.12 and Django, this backend employs a robust multi-tenant architecture with schema-level isolation to ensure maximum security and performance for enterprise clients.

## 🚀 Key Features

- **Multi-Tenant Foundation**: Complete data isolation using `django-tenants` and PostgreSQL schemas.
- **Auto-Onboarding Flow**: Public registration request system with an internal admin approval workflow that auto-provisions tenants.
- **Unified Identity (Admin-Employee)**: Integrated user profile API (`/api/users/me/`) that links Django users with their HR employee records.
- **Indonesian Payroll Engine**: Full compliance with **TER 2024 PPh 21** regulations, BPJS calculations, and dynamic PDF payslip generation.
- **Biometric Attendance**: Geofencing-validated clock-in/out with face reference tracking and liveness check metadata.
- **Comprehensive Reporting**: Standardized CSV/PDF exports for Attendance recaps, Appraisal summaries, and Payroll data.
- **Strategic HR**: KPI tracking, Appraisal lifecycle, and multi-stage approval workflows.
- **SaaS Tiering & Gating**: Model-level logic for plan-based feature enabling (Basic, Professional, Enterprise).

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

## 1. Setup & Installation

### Virtual Environment
```bash
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate
```

### Install Dependencies
```bash
pip install -r requirements.txt
```

### Environment Config
Map your environment variables in a `.env` file or local settings:
- `TENANT_DOMAIN_SUFFIX`: The suffix for tenant domains (default: `harikerja.com`).
- `DATABASE_URL`: Your PostgreSQL connection string.

---

## 2. Database Initialization

The system uses a two-step migration process for multi-tenancy:

```bash
# 1. Migrate shared (public) tables (Tenants, Users, Registration)
python manage.py migrate_schemas --shared

# 2. Migrate tenant-specific tables (HR, Payroll, Attendance)
python manage.py migrate_schemas --tenant
```

### Creating the Foundation
Use the bootstrap command to initialize the public schema and a sample tenant:
```bash
python manage.py bootstrap_tenants
```

---

## 3. Running the Application

### Start Development Server
Enable your virtual environment and run the following:

```bash
# Windows (Standard)
.\venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000

# Windows (Automated Local Dev - RECOMMENDED)
# This script handles Docker, env loading, and migrations automatically:
.\run_dev.ps1
```

# Linux/Mac
```bash
source venv/bin/activate
python manage.py runserver
```

**Verify Backend**:
- **API Status**: [http://localhost:8000/api/users/me/](http://localhost:8000/api/users/me/)
- **Swagger Docs**: [http://localhost:8000/api/schema/swagger-ui/](http://localhost:8000/api/schema/swagger-ui/)

---

## 4. Developing & Testing

### API Documentation
The system automatically generates OpenAPI 3.0 schemas.
- **Swagger UI**: [http://localhost:8000/api/schema/swagger-ui/](http://localhost:8000/api/schema/swagger-ui/)
- **Redoc**: [http://localhost:8000/api/schema/redoc/](http://localhost:8000/api/schema/redoc/)

### Running Tests
The backend uses `pytest` and `manage.py test` with **100% pass rate** across 155+ mission-critical scenarios.

```bash
# General
pytest

# Windows (Auto-configures local DB env & Docker):
# This script ensures Docker is running and uses the project's venv automatically.
.\run_tests.ps1

# To run specific tests:
.\run_tests.ps1 core/tests/test_core.py
```

---

**Project Status**: 🏆 **Stable Release v1.1.0-Hardened (March 21, 2026)**. 100% Tests Passed (155/155).
**Branding Note**: This project was rebranded from Antigravity to **harikerja** on March 16, 2026.
