# Detailed Implementation Plan: Backend (harikerja HRMS)

This plan expands the foundational multi-tenant architecture with the specific HR, Attendance, and Payroll features required for the SaaS platform.

## 1. Multi-Tenant Architecture
The backend uses **schema-level isolation** via `django-tenants`. Each client has a dedicated PostgreSQL schema.
- **Service Layer**: [PayrollCalculator](file:///d:/hr/hrms/backend/payroll/services.py) for Indonesian payroll.
- **BPJS Service**: [BPJSManager](file:///d:/hr/hrms/backend/payroll/services.py) for health and employment insurance logic.
- **Tax Engine**: [TaxEngine](file:///d:/hr/hrms/backend/payroll/services.py) implementing TER 2024 regulations.
- **PDF Service**: [PDFGenerator](file:///d:/hr/hrms/backend/payroll/pdf_generator.py) for ReportLab-based payslips.

## 2. Infrastructure & Scaling
- **Redis Cache**: Used for storing domain-to-tenant mappings and session lookups.
- **PgBouncer**: Manages connection pooling to handle heavy traffic spikes (e.g., 8:00 AM clock-ins).
- **Asynchronous Processing**: Strategy for offloading bulk payroll and PDF generation to background workers (AWS Celery roadmap).

## 3. Security & Access Control
- **Hybrid RBAC**: Combines fixed system roles (`is_staff`, `is_superuser`) with dynamic `AccessRole` JSON permissions.
- **Audit System**: `AuditModelMixin` tracks every change in the master data with deep-diffing support.
- **Ownership Filter**: Strict `get_queryset` filtering ensuring employees only see their own payslips and attendance records.
- **ESS Profile Self-Service**: Dedicated serializer (`EmployeeProfileSerializer`) that restricts editable fields for employees, ensuring master data integrity while allowing personal info updates.
- **Admin Safeguards**: Signals to prevent accidental deletion of critical admin users or roles.

## 4. Operational Modules
### Attendance & Geofencing
- **Verification**: Backend validates GPS coordinates using the Haversine formula against the branch's hard radius (100m).
- **Biometrics**: Stores and verifies liveness metadata (blinks, head movement) from mobile devices.

### Workflow & Approvals
- **State Machine**: Generic engine for multi-stage approvals.
- **Notifications**: Automated dispatcher for system and email alerts upon status change.

## 5. Deployment Framework
- **CI/CD Logic**: Integrated unit testing suite with 155+ scenarios.
- **Environment Management**: Centralized config in `environments/` for Local, Staging (VPS), and Production (AWS).
- **Testing Hub**: 100% logic coverage for calculation-heavy apps (Payroll, Attendance).

## 🚀 Future Scaling Roadmap (Production Scale)
To reliably serve **1 Million+ Users**, the following architectural shifts are planned:

### 1. Database Sharding & Partitioning
- **Sharding**: Distributing tenants across multiple physical database clusters using **Amazon RDS**.
- **Partitioning**: Horizontal partitioning for high-volume logs (Attendance and Audit logs).

### 2. Horizontal Compute Clustering
- **Amazon EKS (Kubernetes)**: Deploying backend pods with Auto-Scaling (HPA) to handle traffic spikes.
- **Amazon CloudFront**: Serving assets and pre-signed PDF payslips via Edge networks.

### 3. Asynchronous Operations
- **Celery + RabbitMQ**: Offloading bulk payroll generation and CSV exports to background workers to keep the main API thread responsive.
