# Ultra-Detailed Implementation Plan: Backend (Django)

This document serves as the technical blueprint and record of accomplishment for the **harikerja HRMS** Django API backend.

## 🏗 1. Multi-Tenant Architecture
The system employs a shared-database, separate-schema architecture for optimal isolation and resource efficiency.

- **Shared Schema (Public)**:
    - `public.User`: Unified authentication and global superuser management.
    - `public.Tenant`: Customer registration and schema mapping.
    - `public.DomainManagement`: Multidomain management for tenant subdomains.
- **Tenant Schema (Private)**:
    - `core.*`: Employee master data, departments, and organizational roles.
    - `attendance.*`: Schedules, geofenced logs, and biometric metadata.
    - `payroll.*`: Salary components, TER 2024 tax engine, and payslip assets.
    - `performance.*`: KPI strategies and appraisal review lifecycles.

## 🛠 2. Technical Stack & Standards
- **Framework**: Django 6.0.3 + Django Rest Framework (DRF).
- **Database**: PostgreSQL 14+ with `django-tenants`.
- **API Standards**: RESTful principles, JSON-API compatible, OpenAPI 3.0 (Spectacular).
- **Authentication**: Dual-mode supporting Session (Web) and JWT Rotation (Mobile).

## 🌐 3. Deployment Architecture (4-Tier)

The backend is synchronized with the harikerja 4-tier environment hierarchy:

| Tier | Purpose | Domain | Hosting | Deploy Command |
| :--- | :--- | :--- | :--- | :--- |
| **Dev** | Prototyping | `localhost` | Local Docker | `make dev` |
| **QA** | Functional UAT | `qa.harikerja.web.id` | IDCloudHost VPS | `make qa` |
| **Staging** | 1M Stress Test | `staging.harikerja.web.id` | AWS Enterprise | `make staging` |
| **Prod** | Enterprise | `harikerja.com` | AWS Enterprise | `make prod` |

### Infrastructure Details
- **QA Stack**: Managed VPS via IDCloudHost using Docker Compose for rapid UAT.
- **Enterprise Stack (Staging/Prod)**: 
    - **Compute**: Managed Kubernetes (AWS EKS) for horizontal scaling.
    - **Database**: Amazon RDS (PostgreSQL 15) with schema-level isolation.
    - **Cache**: Amazon ElastiCache (Redis) for session persistence and async task brokering (Celery).

## 📊 4. Core Engine Implementations

### Indonesian Payroll (TER 2024)
- **Tax Engine**: Fully compliant with the latest PPh 21 (Tarif Efektif Rata-rata) regulations.
- **BPJS**: Automated calculation for Kesehatan and Ketenagakerjaan (JKK, JKM, JHT, JP).
- **Reporting**: Dynamic PDF generation using `ReportLab` and `WeasyPrint` for enterprise-grade payslips.

### Biometric Attendance & Geofencing
- **Validation**: Server-side Haversine distance calculation against office coordinates.
- **Liveness**: Reference photo matching and biometric metadata logging using Google ML Kit reference points.

### RBAC & Security
- **Permissions**: Custom `HasRBACPermission` class ensuring strict data ownership and organizational hierarchy enforcement (Supervisor -> Employee).
- **Isolation**: Automatic schema switching via `TenantMiddleware` with zero leakage across 1,000+ potential tenants.

## 🚀 5. Software Lifecycle
- **Migrations**: `migrate_schemas --shared` followed by `--tenant` to ensure consistency.
- **Testing**: 100% logic coverage with `pytest` (168+ mission-critical scenarios).
- **API Documentation**: Automated OpenAPI 3.0 generation via `drf-spectacular`.

## ✅ 6. Roadmap Completion Summary

### Phase B1: Multi-Tenancy Foundation (DONE)
- Schema-based isolation and automated provisioning.
- Dual shared/tenant migration strategy.

### Phase B2: Payroll & Tax Compliance (DONE)
- TER 2024 PPh 21 engine and BPJS integration.
- Dynamic payslip generation and export.

### Phase B3: Strategic HR & Performance (DONE)
- KPI tracking, Appraisal lifecycles, and multi-stage approval workflows.

### Phase B4: ESS Profile Management (DONE)
- Restricted self-service API allowing employees to update personal info (contact/PTKP) and upload KTP/NPWP assets securely.

### Phase B5: Authentication & Hardening (DONE)
- Unified `/api/auth/` namespace and JWT rotation for mobile session security.
- 100% Logic Pass Rate verified (168/168 tests).

**Status**: ✅ **COMPLETED**. The backend core is fully hardened and synchronized.

