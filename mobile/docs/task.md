# Mobile Development Roadmap (COMPLETED Phase M1-M11)

This roadmap documents the evolution of the **harikerja HRMS** mobile application from its initial infrastructure alignment through its 100% verified production state.

- [x] **M1: Infrastructure Alignment**
    - [x] Optimized headers for `django-tenancy` isolation.
    - [x] Aligned Auth endpoints to `/api/auth/login/`.
    - [x] Precision GPS for attendance correctly integrated (High Accuracy).
- [x] **M2: Profile & Document Sync**
    - [x] Self-service profile updates (phone/address/PTKP).
    - [x] Camera-based document capture (KTP/NPWP).
    - [x] Hardened document validation and preview.
- [x] **M3: Attendance Corrections**
    - [x] Correction request flow (History & Form).
    - [x] Backend workflow integration (Approval/Rejection).
- [x] **M4: Performance Appraisals**
    - [x] Real-time KPI progress visualization and history logs.
    - [x] Interactive self-appraisal submissions with ratings and feedback.
- [x] **M5: Settings & Logout**
    - [x] MVP `SettingsScreen` for app personalization and secure session termination.
    - [x] Logout flow with `flutter_secure_storage` cleanup.
- [x] **M6: Deployment & Environment Sync**
    - [x] 4-Tier Environment Hierarchy (Dev, QA, Staging, Production).
    - [x] Multi-Cloud documentation (IDCloudHost, AWS).
    - [x] Dynamic domain switching via compile-time defines (`--dart-define`).
- [x] **M7: Feature Hardening & i18n**
    - [x] **I18n**: Completed `AppLocalizations` for EN/ID (100+ keys).
    - [x] **Payslips**: Connected to live backend list/detail endpoints.
    - [x] **Home**: Dynamic Recent Activity and Shift Info blocks powered by `getMySchedules`.
    - [x] **Auth**: Implemented JWT Refresh token flow and 401 retry interceptor.
    - [x] **PDF**: Native PDF integration for reports and payslip viewing.
- [x] **M8: Test Synchronization & Verification**
    - [x] Update Backend unit tests for `/api/auth/` URL changes.
    - [x] Re-verify Mobile logic tests (`api_service_test.dart`).
    - [x] Add Backend test for `/api/auth/token/refresh/`.
    - [x] Final 100% test pass verification (168 combined tests).
- [x] **M9: Frontend JWT Hardening**
    - [x] Implement `localStorage` persistence in `AuthContext.tsx`.
    - [x] Add transparent `401` refresh interceptor in `lib/api.ts`.
    - [x] Synchronize Vitest and Playwright mock endpoints.
- [x] **M10: Frontend E2E Automation Hardening**
    - [x] Update `run_e2e.ps1` with port 3000 cleanup logic.
    - [x] Update `playwright.config.ts` with increased timeouts.
    - [x] Final E2E verification (25/25 passing).
- [x] **M11: Real-Backend Mobile Logic Verification**
    - [x] Seed `company1` tenant with consistent master data (admin=1).
    - [x] Synchronize `ApiService.dart` endpoints (e.g., `/schedules/`).
    - [x] Add `is_late` derived field calculation to `AttendanceSerializer`.
    - [x] Verify 100% pass rate for mobile ESS logic suite (24/24 passing).

**Final Result**: ✅ All phases 100% completed and verified against the live backend infrastructure.
