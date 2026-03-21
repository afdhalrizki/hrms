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

## 10. DevOps, QA & Onboarding Baseline
- [x] [Phase 10] Create dedicated [environments/](file:///d:/hr/hrms/environments) structure.
- [x] [Phase 11] Define [Manual Testing](file:///d:/hr/hrms/qa/manual/checklist.md) checklists.
- [x] [Phase 12] Implement Registration Flow (Public Signup & Admin Approval).
- [x] [Phase 13] Implement automated E2E tests for core flows (Playwright).

## Phase 14: Deployment Strategy & Documentation
- [x] Create `deployment/` directory for environment guides.
- [x] Document Local, Staging (VPS), and Production (K8s) deployment steps.

## Phase 15-23: Onboarding & Identity Integration
- [x] **Phase 15**: Implement `RegistrationRequest` model.
- [x] **Phase 16**: Create `PublicSignupViewSet`.
- [x] **Phase 17**: Implement Internal Admin Approval action.
- [x] **Phase 18**: Global Domain Suffix (`harikerja.com`) Refactor.
- [x] **Phase 19**: Frontend Premium Signup Page Implementation.
- [x] **Phase 20**: Internal Admin Registration Approval UI.
- [x] **Phase 21**: Auto-provision Default Dept/Role/Admin on approval.
- [x] **Phase 22**: Unified `/api/users/me/` endpoint for mobile-web sync.
- [x] **Phase 23**: AuthContext & Frontend Identity Hydration.

## Phase 24: Tenant Customization (Branding)
- [x] Update `Tenant` model with `logo`, `address`, `phone`.
- [x] Create company settings page with logo upload form in Next.js.
- [x] Update Sidebar to dynamically render the uploaded logo.

## Phase 25: Admin & Employee Provisioning
- [x] Update `EmployeeViewSet.create()` to handle `create_user` and `is_admin` flags.
- [x] Build 'Add Employee' modal with provisioning toggles.

## Phase 26: Admin Access Safeguard & Protections
- [x] Prevent demoting `is_staff` or deleting the last admin via Django signals.

## Phase 27: Hybrid RBAC Implementation
- [x] Create `AccessRole` with JSON permissions and `HasRBACPermission` guard.
- [x] Add roles management UI and role selection in provisioning.

## Phase 28: Platform Access & Dynamic UI
- [x] Implement dynamic sidebar menu visibility based on user roles.

## Phase 29: Secret Admin Portal
- [x] Create a hidden login route at `/login/portal-admin` for global admins.

## Phase 30: Frontend Runtime Infrastructure
- [x] Update Docker image to `node:20.18-alpine` for Node version compliance.

## Phase 31: Local Multi-tenant Access Fix (.localhost)
- [x] Update `CORS_ALLOWED_ORIGIN_REGEXES` and `getBaseUrl` for local development.

## Phase 32: Build Resilience & Tailwind 4 Support
- [x] Switch to `node:22-bookworm-slim` for Debian/glibc compatibility.

## Phase 33: Production Domain Readiness & System Recovery
- [x] Configure production domain `harikerja.com` and implement cleanup scripts.

## Phase 34: Universal Data Ownership & Security
- [x] Implement ownership-based filtering in `get_queryset` (Self-Service).

## Phase 35: Leave Balance Tracking (Quotas)
- [x] Add `LeaveBalance` model to track and automate leave deductions.

## Phase 36: Overtime Compensation (Payroll Integration)
- [x] Integrate approved Hours into `PayrollCalculator` with hierarchical rates.

## Phase 37: Reporting Hierarchy (Supervisor)
- [x] Add self-referential `supervisor` field for organizational tree support.

## Phase 38: Dynamic & Multi-Stage Approval Workflow
- [x] Add configurable approval levels (Supervisor, HR, BOTH) to `Tenant`.

## Phase 39: Tenant Admin Access & Public Security
- [x] Enabled Django Admin in `TENANT_APPS` and hardened global portal access.

## Phase 40: Tenant Admin Limits (Quota Management)
- [x] Add `max_admins` field (Default: 5) and enforce via signals.

## Phase 41: Advanced Operational - Reimbursement & Expense Claim
- [x] **Model**: Create `Reimbursement` and `ReimbursementCategory` models.
- [x] **Workflow**: Implement multi-stage approval (Supervisor -> Finance/HR).
- [x] **Reporting**: Export claim summaries and integrated with Payroll engine.

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

## Phase 49: Backend Test Coverage & RBAC Hardening [COMPLETED]
- [x] **Performance**: Implement 33 comprehensive unit tests for KPI, Appraisal, and Appraisal Reviews.
- [x] **Attendance**: Expand 11 scenarios covering flexible shifts, multi-branch geofencing, and leave conflicts.
- [x] **RBAC**: Harden `HasRBACPermission` and `perform_update` logic to restrict sensitive field modifications.
- [x] **Security**: Verify `max_admins` enforcement and `create_user` provisioning logic.
- [x] **Verification**: 100% Success Rate (**104/104 tests passing**).

## Phase 50: Config Module & Infrastructure Test Expansion [COMPLETED]
- [x] **Middleware**: Verify `SubscriptionMiddleware` (Blocked/Read-Only modes) and `TenantAccessMiddleware`.
- [x] **Security**: Verify `CORS_ALLOWED_ORIGIN_REGEXES` and `CSRF_TRUSTED_ORIGINS`.
- [x] **i18n**: Verify `LocaleMiddleware` and language switching (EN/ID).
- [x] **Infrastructure**: Verify Cache (LocMem/Redis) connectivity and Static/Media URL configurations.
- [x] **Verification**: Ensure all 109 tests pass including new infrastructure scenarios.

## Phase 51: Core Master Data & Audit Expansion [COMPLETED]
- [x] **Master Data**: Verify `Branch` CRUD and geofencing configuration.
- [x] **RBAC**: Verify `AccessRole` management and protection for default system roles.
- [x] **Infrastructure**: Verify `SystemNotification` lifecycle and `APIKey` management.
- [x] **Auditing**: Verify `AuditLog` generation for master data changes via `AuditModelMixin`.
- [x] **Verification**: Ensure all 115 tests pass including new core master data scenarios.

## Phase 52: Users Module Test Expansion [COMPLETED]
- [x] **Authentication**: Verify `LoginAPIView` success and failure flows (auth-login).
- [x] **Identity**: Verify CASE-INSENSITIVE `UserManager` email normalization and `is_staff` filtering.
- [x] **Safeguards**: Verify multi-tenant admin deletion prevention and reverse M2M `max_admins` enforcement.
- [x] **Verification**: Ensure all 129 tests pass including new user scenarios and fixes.

## Phase 53: Payroll Module Test Expansion [COMPLETED]
- [x] **Overtime**: Verify precedence logic (Golongan > Tenant > Divisor) and exclusion of non-approved records.
- [x] **Reimbursement**: Verify addition of approved claims to gross pay.
- [x] **BPJS**: Explicitly verify wage caps for Health (12m) and JP (10.04m).
- [x] **RBAC**: Verify self-service filtering for payslips and details (employees only see own).
- [x] **Uniqueness**: Verify duplicate payslip prevention via (employee, period) constraint.
- [x] **Verification**: 100% Success Rate (**129/129 tests passing**).

## Phase 54: Tenants Module Test Expansion [COMPLETED]
- [x] **Settings API**: Verify authorized/unauthorized CRUD for `logo`, `address`, `phone`, and `overtime_rate`.
- [x] **Registration**: Verify `subdomain_prefix` collisions and duplicate approval/rejection prevention.
- [x] **Provisioning**: Verify creation of `HR Administrator` and `Standard Employee` roles and admin `Employee` linkage.
- [x] **Verification**: 100% Success Rate (**135/135 tests passing**).

## Phase 55: Reimbursement Module Test Expansion [COMPLETED]
- [x] **Validation**: Verify `amount > 0` and `category.max_amount` enforcement.
- [x] **RBAC**: Verify hierarchy (Supervisor see subordinates, Employee sees self only).
- [x] **Workflow**: Verify rejection permanence and out-of-order multi-stage approvals.
- [x] **Reporting**: Verify `export_csv` data accuracy and filtering.
- [x] **Verification**: 100% Success Rate (**141/141 tests passing**).

## Phase 56: Comprehensive Backend Test Hardening [COMPLETED]
- [x] **Attendance**: Verify leave balance auto-deduction and overnight shifts.
- [x] **Performance**: Verify appraisal reviewer permissions and KPI target uniqueness.
- [x] **Core**: Verify employee lifecycle (termination) and AccessRole schema.
- [x] **Verification**: 100% Success Rate (**144/144 tests passing**).
## Phase 57: Pytest Migration & Test Modernization [COMPLETED]
- [x] Add `pytest` and `pytest-django` to `requirements.txt`
- [x] Migrate all monolithic verification scripts to granular Pytest tests
- [x] Implement modern functional test using `tenant_client` in `users/tests.py`
- [x] Verify 100% pass rate for the full Pytest suite (149 tests)
- [x] Update documentation (`docs/walkthrough.md`) with Pytest instructions

## Phase 60: Comprehensive Django Admin Registration [COMPLETED]
- [x] **Reimbursement**: Register `ReimbursementCategory` and `Reimbursement` models.
- [x] **Performance**: Register `KPI`, `KPITarget`, `Appraisal`, and `AppraisalReview`.
- [x] **Verification**: Verify all modules are accessible in the Django Admin portal.

## Phase 61: Comprehensive Reporting System [COMPLETED]
- [x] **Attendance**: Monthly attendance recap export (CSV/Excel).
- [x] **Performance**: Annual appraisal summary and KPI attainment reports.
- [ ] **Executive Dashboard**: Unified cross-module insights (Headcount, Late Trends, Budget vs Actual).
- [x] **Phase 62**: Attendance Correction System (Correction Requests & Approval Workflow).

## Future Roadmap
- [ ] **Phase 57**: Horizontal App Scaling (Kubernetes).
- [ ] **Phase 58**: Database Sharding for Heavy Tenants.
- [ ] **Phase 59**: Background Job Engine (Celery/RabbitMQ).
