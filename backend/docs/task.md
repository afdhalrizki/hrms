# Master Implementation Checklist: Backend (harikerja HRMS)

This task list tracks the complete setup of the Django multi-tenant foundation and the core HR, Attendance, and Payroll models.

## 1. Multi-Tenant Foundation & Auth
- [x] Create Custom [User](file:///d:/hr/hrms/backend/users/models.py) model in [core/models.py](file:///d:/hr/hrms/backend/core/models.py) (Email as login).
- [x] Update `AUTH_USER_MODEL` in [config/settings.py](file:///d:/hr/hrms/backend/config/settings.py).
- [x] Register [Tenant](file:///d:/hr/hrms/backend/tenants/models.py) and [Domain](file:///d:/hr/hrms/backend/tenants/models.py) models in `tenants/admin.py`.

## 2. Core HR Module (`core` app)
- [x] Define [Department](file:///d:/hr/hrms/backend/core/models.py), [Role](file:///d:/hr/hrms/backend/core/models.py), [Golongan](file:///d:/hr/hrms/backend/core/models.py) models.
- [x] Define [Employee](file:///d:/hr/hrms/backend/core/models.py) model with PTKP status for PPh 21.
- [x] Create admin interfaces in [core/admin.py](file:///d:/hr/hrms/backend/core/admin.py).

## 3. Attendance Module (`attendance` app)
- [x] Create Django app `attendance` and add to `TENANT_APPS`.
- [x] Create [Attendance](file:///d:/hr/hrms/backend/attendance/models.py) model (date, check_in, check_out, location/photo fields for mobile app).
- [x] Create [LeaveRequest](file:///d:/hr/hrms/backend/attendance/models.py) model (Permohonan Cuti/Izin/Sakit).
- [x] Create [Overtime](file:///d:/hr/hrms/backend/attendance/models.py) model (Lembur - date, hours, approval status).
- [x] Register attendance models in [attendance/admin.py](file:///d:/hr/hrms/backend/attendance/admin.py).

## 4. Payroll Module (`payroll` app)
- [x] Create Django app `payroll` and add to `TENANT_APPS`.
- [x] Create [SalaryComponent](file:///d:/hr/hrms/backend/payroll/models.py) model (master data for Allowances & Deductions/Pinjaman).
- [x] Create [PayrollPeriod](file:///d:/hr/hrms/backend/payroll/models.py) model (billing cycle).
- [x] Create [Payslip](file:///d:/hr/hrms/backend/payroll/models.py) model (Slip Gaji connecting Employee, Period, Totals, PPh 21 calculation).
- [x] Create [PayslipDetail](file:///d:/hr/hrms/backend/payroll/models.py) for line items (Tunjangan, Potongan, Lembur, Pajak).
- [x] Register payroll models in [payroll/admin.py](file:///d:/hr/hrms/backend/payroll/admin.py).

## 5. Migrations & Initialization
- [x] Run `makemigrations` for all apps (`core`, `tenants`, `attendance`, `payroll`).
- [x] Run `migrate_schemas --shared` to create public schema tables.
- [x] Create the `public` tenant (domain: `harikerja.com`) and `company1` tenant (domain: `company1.harikerja.com`).
- [x] Run `migrate_schemas --tenant` to create tenant-specific tables.

## 6. Backend API Development
- [x] Create Serializers for all models (`users`, `core`, `attendance`, `payroll`).
- [x] Implement ViewSets and register URLs.
- [x] Verify API endpoints with `public` and `company1` schemas.

## 9. Payroll Engine & Indonesian Tax
- [x] Implement `PTKP_TER_MAPPING` constants in [payroll/services.py](file:///d:/hr/hrms/backend/payroll/services.py).
- [x] Implement `BPJS` calculation engine.
- [x] Implement `TER` Monthly PPh 21 logic (2024 Regs).
- [x] Create `Generate Payslip` action in [PayslipViewSet](file:///d:/hr/hrms/backend/payroll/views.py).
- [x] Implement [PDFGenerator](file:///d:/hr/hrms/backend/payroll/pdf_generator.py) service with ReportLab for Payslip downloads.

## Phase 14-23: Onboarding & Identity Integration
- [x] **Phase 15**: Implement `RegistrationRequest` model.
- [x] **Phase 16**: Create `PublicSignupViewSet`.
- [x] **Phase 17**: Implement Internal Admin Approval action.
- [x] **Phase 18**: Global Domain Suffix (`harikerja.com`) Refactor.
- [x] **Phase 21**: Auto-provision Default Dept/Role/Admin on approval.
- [x] **Phase 22**: Unified `/api/users/me/` endpoint for mobile-web sync.

## Phase 24-40: Operational Polish
- [x] **Phase 24**: Update `Tenant` model with `logo`, `address`, `phone`.
- [x] **Phase 26**: Admin Access Safeguard & Protections (Django signals).
- [x] **Phase 27**: Hybrid RBAC Implementation (`AccessRole` model).
- [x] **Phase 34**: Universal Data Ownership & Security (`get_queryset` filtering).
- [x] **Phase 35**: Leave Balance Tracking (Quotas).
- [x] **Phase 36**: Overtime Compensation (Payroll Integration).
- [x] **Phase 37**: Reporting Hierarchy (Supervisor field).
- [x] **Phase 38**: Dynamic & Multi-Stage Approval Workflow implementation.
- [x] **Phase 39**: Tenant Admin Access & Public Security hardening.
- [x] **Phase 40**: Tenant Admin Limits (Quota Management).

## Phase 41-48: Advanced Modules
- [x] **Phase 41**: Reimbursement Claims & Workflow implementation.
- [x] **Phase 42**: Internationalization (i18n) backend support.
- [x] **Phase 43**: PPh 21 (TER 2024) & BPJS Core precision hardening.
- [x] **Phase 44**: Multi-Branch Geofencing & Flexible Shifts implementation.
- [x] **Phase 45**: Strategic HR - Performance & KPI (MVP Implementation).
- [x] **Phase 46**: Public API Keys & Storage Quota control.
- [x] **Phase 47**: Subscription Expiry & Data Lifecycle management.
- [x] **Phase 48**: Modular Tiering & Plan-based feature gating.

## Phase 49-62: Testing & Hardening [ALL COMPLETED]
- [x] **Phase 52**: Users Module Test Expansion (129 cases).
- [x] **Phase 53**: Payroll Module Test Expansion (129 cases).
- [x] **Phase 54**: Tenants Module Test Expansion (135 cases).
- [x] **Phase 55**: Reimbursement Module Test Expansion (141 cases).
- [x] **Phase 56**: Final Backend Test Hardening (144 cases).
- [x] **Phase 57**: Pytest Migration & Test Modernization (155 scenarios).
- [x] **Phase 60**: Comprehensive Django Admin Registration for 62+ models.
- [x] **Phase 62**: Attendance Correction System (Correction Requests & Workflow).

## 🚀 Future Roadmap & Scaling
- [ ] **Phase 63**: Horizontal App Scaling with **Kubernetes (EKS)**. <!-- id: 701 -->
- [ ] **Phase 64**: Database Sharding & Partitioning for heavy tenants via **Amazon RDS**. <!-- id: 702 -->
- [ ] **Phase 65**: Background Job Engine (Celery/RabbitMQ) for bulk reports. <!-- id: 703 -->
- [ ] **Phase 66**: Multi-Region Deployment for Reduced Global Latency. <!-- id: 704 -->
- [ ] **Phase 67**: Advanced AI Predictive Analytics for Attrition Risk. <!-- id: 705 -->
