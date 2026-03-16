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

## 7. Backend API Development
- [x] Create Serializers for all models (`users`, `core`, `attendance`, `payroll`).
- [x] Implement ViewSets and register URLs.
- [x] Verify API endpoints with `public` and `company1` schemas.

## 8. Frontend Integration (Next.js)
- [x] Configure API Client with Tenant Header handling.
- [x] Implement Main Dashboard Layout (Sidebar + Navigation).
- [x] Create HR Department/Employee Management Pages.
- [x] Create Attendance Tracking Dashboard.
- [x] Create Payroll & Payslip View.

## 9. Polish & Aesthetics
- [x] Implement Dark Mode and Glassmorphism UI.
- [x] Add smooth transitions and micro-animations.

## 10. Mobile App Development (Flutter)
- [x] Initialize Flutter project in `mobile/`.
- [x] Rename project to `mobile` and update all platform identifiers.
- [x] Implement Tenant-aware Login screen.
- [x] Create Employee Home Dashboard.
- [x] Implement Geolocation-based Attendance (Check-in/out).
- [x] Create Mobile Payslip Viewer.

## 12. Payroll Engine & Indonesian Tax (Pro Phase)
- [x] Implement `PTKP_TER_MAPPING` constants in [payroll/services.py](file:///d:/hr/hrms/backend/payroll/services.py).
- [x] Implement `BPJS` calculation engine.
- [x] Implement `TER` Monthly PPh 21 logic (2024 Regs).
- [x] Create `Generate Payslip` action in [PayslipViewSet](file:///d:/hr/hrms/backend/payroll/views.py).
- [x] Implement [PDFGenerator](file:///d:/hr/hrms/backend/payroll/pdf_generator.py) service with ReportLab for Payslip downlaods.
- [x] Add PDF Download button integration to Frontend and Mobile (with `dart:html` workaround for Windows Dev Mode restrictions).

## 13. Unit Testing & Quality Assurance
- [x] Implement Backend Payroll Engine tests.
- [x] Implement Backend Multi-tenancy isolation tests (Core & Tenants).
- [x] Fix and expand Mobile widget & logic tests.
- [x] Add basic Frontend component smoke tests.

## 14. Final Verification & Handover
- [x] Run full cross-platform test suite.

## Phase 2: Enterprise Infrastructure & Advanced MVP
- [x] Add `redis` to [docker-compose.yml](file:///d:/hr/hrms/docker-compose.yml) for request caching.
- [x] Add `pgbouncer` to [docker-compose.yml](file:///d:/hr/hrms/docker-compose.yml) for connection pooling.
- [x] Implement Geofencing radius validation logic in Django [AttendanceViewSet](file:///d:/hr/hrms/backend/attendance/views.py).
- [x] Research/Integrate Face Recognition checks for mobile Check-In.
- [x] Create Executive Analytics Cost Dashboard in Next.js.
- [x] Implement Audit Trail (created_by/updated_by) across all models.
- [x] Final documentation update (Backend, Frontend, Mobile).
- [x] Relocate documentation files to `docs/` folder.

## Phase 3: Operational Scale & Security (Advanced HR)
- [x] Create [Shift](file:///d:/hr/hrms/backend/attendance/models.py) and [Schedule](file:///d:/hr/hrms/backend/attendance/models.py) models in Backend.
- [x] Implement Shift Assignment UI in Next.js Admin.
- [x] Update Attendance logic to validate against assigned shifts.
- [x] **Face Recognition / Biometric Flow (Mobile)**:
    - [x] Add `face_reference` to [Employee](file:///d:/hr/hrms/backend/core/models.py) model (Backend).
    - [x] Integrate `google_mlkit_face_detection` (Mobile).
    - [x] Implement camera flow with liveness check.
- [x] Create ESS (Employee Self-Service) Shift Viewer in Mobile.
- [x] Implement Tenant-Specific Admin Access (restrict user login by domain).
- [x] Update walkthrough.md with images located in `docs/` folder.
- [x] **API Documentation (Swagger/OpenAPI)**: Install and configure `drf-spectacular`.
- [x] **Attendance Dashboard Sync**: Connected Next.js dashboard to real-time API with liveness & GPS metadata.

## Phase 4: Global Enterprise Scale (Roadmap)
- [ ] **Horizontal App Scaling**: Migrate to Kubernetes (K8s) with HPA (Horizontal Pod Autoscaler).
- [ ] **Database Sharding**: Distribute heavy tenants across multiple PostgreSQL physical clusters.
- [ ] **Read Replicas**: Implement DB Read Replicas for Analytics/Reporting to offload the Write primary.
- [ ] **Background Job Engine**: Integrate Celery + RabbitMQ for asynchronous bulk operations (1M+ Payslips).
- [ ] **Global CDN**: Serve frontend and static assets via Edge locations.

## 15. DevOps & Environment Management
- [x] Create dedicated [environments/](file:///d:/hr/hrms/environments) structure.
- [x] [v] Define `.env.development.example` for local coding.
- [x] [v] Define `.env.staging.example` for pre-production testing.
- [x] [v] Define `.env.production.example` for live deployment.
- [ ] Implement CI/CD pipeline to automate deployment between environments.

## 16. Quality Assurance (QA) & Reliability
- [x] Create centralized [qa/](file:///d:/hr/hrms/qa) hub.
- [x] Implement [Performance](file:///d:/hr/hrms/qa/performance/locustfile.py) testing boilerplate (Locust).
- [x] Define [Manual Testing](file:///d:/hr/hrms/qa/manual/checklist.md) checklists.
- [x] Complete Backend Attendance Unit Tests (Geofencing, Shifts, Leave).
- [x] Complete Backend Core HR Unit Tests (Employee, Dept, Master Data).
- [x] Complete Backend Config Smoke Tests (Multi-tenant settings, Middleware).
- [x] Complete Backend Tenant Unit Tests (Schema & Domain foundation + Registration Flow).
- [x] Complete Backend User Unit Tests (Auth & Tenant Access Middleware).
- [x] Complete Backend Payroll Unit Tests (Tax TER 2024, BPJS, PDF).
- [x] Refactor [settings.py](file:///d:/hr/hrms/backend/config/settings.py) for dynamic environment management.
- [x] Implement automated E2E tests for core flows (Playwright).
    - [x] Install Playwright dependencies and browsers.
    - [x] Configure `playwright.config.ts`.
    - [x] Create `onboarding.spec.ts`.
    - [x] Verify full registration flow via E2E test.
- [ ] Conduct security audit for multi-tenant isolation.

## 17. Tenant Onboarding & Approval Flow
- [x] Implement `RegistrationRequest` model in `tenants` app.
- [x] Create `PublicSignupViewSet` for unauthenticated registration.
- [x] Implement internal admin approval action (triggers tenant creation).
- [x] Implement automated Admin User creation for new tenants.
- [x] Add email notification stubs for onboarding status.
- [x] Verify Tenant Onboarding & Approval Flow with integration tests (RegistrationFlowTestCase).

## 18. Global Domain Suffix Refactor
- [x] Define `TENANT_DOMAIN_SUFFIX` in `settings.py`.
- [x] Implement dynamic domain resolution in `RegistrationApprovalViewSet`.
- [x] Update `bootstrap_tenants` command to use global setting.
- [x] Refactor `tenants` test suite for dynamic domain support.
- [x] Update `README.md` with environment variable documentation.

## 19. Frontend Integration: Onboarding & Dynamic Config
- [x] Refactor `api.ts` for dynamic host resolution.
- [x] Update `TenantContext` to support configurable domain suffixes.
- [x] Implement Premium Signup Page (`/signup`).
- [x] Implement Internal Admin Registration Approval UI.
- [x] Verify frontend-backend integration for the full registration flow.

## 20. Frontend Unit Testing: Logic & Component Verification
- [x] Implement Unit Tests for `getBaseUrl` (local/dynamic/env).
- [x] Implement Unit Tests for `TenantContext` logic (subdomain extraction).
- [x] Implement Component Tests for `/signup` (form state/submission).
- [x] Implement Component Tests for `/admin/registrations` (data grid/actions).
- [x] Verify 100% logic coverage for critical frontend helpers.

## 21. Admin-Employee Mobile Integration
- [x] Auto-provision Default Department & Role for new tenants.
- [x] Auto-provision Admin as the first `Employee` on approval.
- [x] Implement `/api/users/me/` endpoint (linking User + Employee).
- [x] Refactor Mobile app to use real profile data (remove mocks).
- [x] Verify Attendance check-in with auto-created admin-employee.

## 22. Backend Test Expansion: Admin-Employee Integration
- [x] Update `tenants/tests.py` with HR provisioning assertions.
- [x] Update `users/tests.py` with unified `/api/users/me/` verification.
- [x] Verify cross-tenant isolation for aggregated profile data.

## 23. Frontend Identity Integration & Test Updates
- [x] Implement `AuthContext` for user state.
- [x] Hydrate Sidebar and Home with real identity data.
- [x] Create `Sidebar.test.tsx` to verify dynamic profile display.

## Phase 14: Deployment Strategy & Documentation (New)
- [x] Create `deployment/` directory for environment guides.
- [x] Document Local Development deployment steps.
- [x] Document Staging (VPS/Single Node) deployment steps.
- [x] Document Production (Kubernetes/Hyperscaler) deployment steps.

## Phase 24: Tenant Customization (Company Profile Hub)
- [x] **Backend**: Update `Tenant` model with `logo`, `address`, `phone`.
- [x] **Backend**: Configure `MEDIA_ROOT` and `MEDIA_URL` for file uploads.
- [x] **Backend**: Run `makemigrations` and `migrate_schemas --shared`.
- [x] **Backend**: Create API endpoint (`/api/tenant/settings/`) for updates.
- [x] **Frontend**: Update `TenantContext` to fetch and store full profile data.
- [x] **Frontend**: Create `src/app/settings/page.tsx` with logo upload form.
- [x] **Frontend**: Update `Sidebar.tsx` to dynamically render the uploaded logo.

## Phase 25: Admin & Employee Provisioning (RBAC Foundation)
- [x] **Backend**: Update `EmployeeViewSet.create()` to handle `create_user` and `is_admin` flags.
- [x] **Frontend**: Connect `EmployeesPage` (`/employees`) to the live API.
- [x] **Frontend**: Build 'Add Employee' form modal with user account toggles.
- [x] **Frontend**: Test dynamic list updating after creation.
