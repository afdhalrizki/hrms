# harikerja HRMS SaaS Implementation Checklist

This checklist tracks the setup of the Django multi-tenant foundation and the core HR, Attendance, and Payroll models based on the reference features.

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

## 7. Frontend Integration (Next.js)
- [x] Configure API Client with Tenant Header handling.
- [x] Implement Main Dashboard Layout (Sidebar + Navigation).
- [x] Create HR Department/Employee Management Pages.
- [x] Create Attendance Tracking Dashboard.
- [x] Create Payroll & Payslip View.

## 8. Mobile App Development (Flutter)
- [x] Initialize Flutter project in `mobile/`.
- [x] Rename project to `mobile` and update all platform identifiers.
- [x] Implement Tenant-aware Login screen.
- [x] Create Employee Home Dashboard.
- [x] Implement Geolocation-based Attendance (Check-in/out).
- [x] Create Mobile Payslip Viewer.

## 9. Payroll Engine & Indonesian Tax
- [x] Implement `PTKP_TER_MAPPING` constants in [payroll/services.py](file:///d:/hr/hrms/backend/payroll/services.py).
- [x] Implement `BPJS` calculation engine.
- [x] Implement `TER` Monthly PPh 21 logic (2024 Regs).
- [x] Create `Generate Payslip` action in [PayslipViewSet](file:///d:/hr/hrms/backend/payroll/views.py).
- [x] Implement [PDFGenerator](file:///d:/hr/hrms/backend/payroll/pdf_generator.py) service with ReportLab for Payslip downloads.

## 10. DevOps, QA & Onboarding
- [x] Create dedicated [environments/](file:///d:/hr/hrms/environments) structure.
- [x] Define [Manual Testing](file:///d:/hr/hrms/qa/manual/checklist.md) checklists.
- [x] Implement `RegistrationRequest` flow for Tenant Onboarding.
- [x] Implement automated E2E tests for core flows (Playwright).
- [x] **Phase 14**: Document Deployment Strategy (Local, Staging, Prod).

## Phase 24: Tenant Customization
- [x] **Backend**: Update `Tenant` model with `logo`, `address`, `phone`.
- [x] **Frontend**: Create company settings page with logo upload.

## Phase 25: Admin & Employee Provisioning
- [x] **Backend**: Handle `create_user` and `is_admin` flags in `EmployeeViewSet`.
- [x] **Frontend**: Build 'Add Employee' modal with provisioning toggles.

## Phase 26: Admin Access Safeguard & Protections
- [x] **Backend**: Prevent last admin deletion/demotion via signals.

## Phase 27: Hybrid RBAC
- [x] **Backend**: Created `AccessRole` with JSON permissions and `HasRBACPermission` guard.
- [x] **Frontend**: Roles management UI and role selection in provisioning.

## Phase 30: Frontend Runtime Infrastructure
- [x] **Dockerfile**: Update base image to `node:20.18-alpine`.
- [x] **Build Strategy**: Use `--no-cache` for clean environment refresh.

## Phase 31: Local Multi-tenant Access Fix (.localhost)
- [x] **Backend**: Update `CORS_ALLOWED_ORIGIN_REGEXES` for localhost.
- [x] **Frontend**: Refactor `getBaseUrl` for dynamic subdomain discovery.

## Phase 32: Build Resilience & Tailwind 4 Support
- [x] **Dockerfile**: Switch to `node:22-bookworm-slim` for Debian/glibc compatibility.

## Phase 33: Production Domain Readiness & System Recovery
- [x] Configure production domain `harikerja.com` in settings.
- [x] Implement system recovery and cleanup scripts (`up.ps1`).

## Phase 34: Universal Data Ownership & Security
- [x] Implement ownership-based filtering across all core modules.
- [x] Restrict Employees to their own records (Self-Service).

## Phase 35: Leave Balance Tracking (Quotas)
- [x] Add `LeaveBalance` model to track and automate leave deductions.

## Phase 36: Overtime Compensation (Payroll Integration)
- [x] Integrate approved Hours into `PayrollCalculator` with hierarchical rates.

## Phase 37: Reporting Hierarchy (Supervisor)
- [x] Add `supervisor` field to the `Employee` model for organizational tree support.

## Phase 38: Dynamic & Multi-Stage Approval Workflow
- [x] Add configurable approval levels (Supervisor, HR, BOTH) to `Tenant`.

## Phase 39: Tenant Admin Access & Public Security
- [x] Enabled Django Admin in `TENANT_APPS` and hardened global portal access.

## Phase 40: Tenant Admin Limits (Quota Management)
- [x] Add `max_admins` field (Default: 5) and enforce via signals.

## Phase 41: Advanced Operational - Reimbursement & Expense Claim
- [x] Implement Reimbursement models, multi-stage approval, and Payroll integration.

## Phase 42: Advanced Operational - Internationalization (i18n)
- [x] Setup Django, Next.js, and Mobile bilingual support (ID/EN).

## Phase 43: Advanced Compliance - PPh 21 (TER 2024) & BPJS Core
- [x] Update Payroll engine for TER 2024 compliance and precise BPJS calculations.

## Phase 44: Organizational Complexity - Multi-Branch & Flexible Routing
- [x] Add `Branch` geofencing, Flexible Shifts, and Dynamic N-Level Approvals.

## Phase 45: Strategic HR - Performance & KPI (MVP)
- [x] Define KPI targets and implement Appraisal workflow (Self & Manager Review).

## Phase 46: Infrastructure - API & Quota Control
- [x] Implement Public API keys and Tenant-specific Storage Quota enforcement.

## Phase 47: SaaS Subscription Expiry & Data Lifecycle
- [x] Access guards for Read-only (Expired) and Locked (Suspended) modes.

## Phase 48: Modular Tiering & Feature Access Control
- [x] Implement plan-based module gating (BASIC/PRO/ENTERPRISE).

## Phase 49: Backend Test Coverage & RBAC Hardening
- [x] Implement 33 unit tests for Performance and 11 for Attendance.
- [x] Verify 100% Success Rate (**104/104 tests passing**).

## Phase 50: Config Module & Infrastructure Test Expansion
- [x] Verify `SubscriptionMiddleware`, `LocaleMiddleware`, and Cache connectivity.
- [x] Ensure all 109 tests pass including new infrastructure scenarios.

## Phase 51: Core Master Data & Audit Expansion
- [x] Verify `Branch` CRUD, `AccessRole` protection, and `AuditLog` generation.
- [x] Ensure all 115 tests pass including new core master data scenarios.

## Phase 52: Users Module Test Expansion
- [x] Verify `LoginAPIView`, email normalization, and multi-tenant admin safeguards.
- [x] Ensure all 121 tests pass including new user scenarios.

## Phase 4: Global Enterprise Scale (Roadmap)
- [ ] **Horizontal App Scaling**: Migrate to Kubernetes (K8s).
- [ ] **Database Sharding**: Distribute heavy tenants across clusters.
- [ ] **Background Job Engine**: Integrate Celery + RabbitMQ for bulk operations.
