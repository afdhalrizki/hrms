# Ultra-Detailed Implementation Plan: Backend (Django) reference

This document serves as the technical blueprint for the **harikerja HRMS** Django API backend.

## 🏗 1. Multi-Tenant Architecture
- **Schema Isolation**: Using `django-tenants` to provide one PostgreSQL schema per customer.
- **Shared Schema**: Contains `public.User`, `public.Tenant`, and `public.DomainManagement`.
- **Tenant Schema**: Contains `attendance.*`, `payroll.*`, `core.*`, and `performance.*`.

## 🌐 2. Deployment Architecture (4-Tier)

The backend is synchronized with the harikerja 4-tier environment hierarchy:

| Tier | Purpose | Domain | Hosting | Deploy Command |
| :--- | :--- | :--- | :--- | :--- |
| **Dev** | Prototyping | `localhost` | Docker | `make dev` |
| **QA** | Functional UAT | `harilibur.web.id` | IDCloudHost | `make qa` |
| **Staging** | 1M Stress Test | `harikerja.web.id` | AWS | `make staging` |
| **Prod** | Enterprise | `harikerja.com` | AWS | `make prod` |

### Infrastructure Details
- **QA**: Managed VPS via IDCloudHost using Docker Compose.
- **Staging/Prod**: Managed Kubernetes (AWS EKS) with Amazon RDS (PostgreSQL) and ElastiCache (Redis).

## 📊 3. Core Logic Modules
- **Attendance**: Geofencing and AI Biometric verification.
- **Payroll**: TER 2024 compliance and dynamic PDF generation.
- **Performance**: KPI tracking and multi-stage appraisal lifecycles.
- **Reimbursement**: Automated expense claims with approval workflows.

## 🚀 4. Software Lifecycle
- **Migrations**: `migrate_schemas --shared` followed by `--tenant`.
- **Testing**: 100% logic coverage with `pytest`.
- **API Docs**: Automated OpenAPI 3.0 generation (Spectacular).
