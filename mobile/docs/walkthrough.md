# Walkthrough: Mobile Alignment & Expansion (Phase M1-M5)

This document summarizes the technical changes and verification results for the Flutter mobile application hardening.

## Completed Features

### 1. Infrastructure Hardening (M1)
- Fixed `ApiService` headers (`X-Tenant-Domain` and `Host`).
- Fixed login URL to `/api/auth/login/`.
- Integrated `geolocator` for real-time GPS tracking in `HomeScreen`.

### 2. ESS Profile Management (M2)
- New `ProfileEditScreen` for self-service updates.
- New `ProfileDocumentsScreen` with camera capture for KTP/NPWP.
- Supported `PATCH` and `MultipartRequest` in `ApiService`.

### 3. Attendance Corrections (M3)
- New `CorrectionRequestScreen` for history-based adjustment requests.
- Integrated with backend `AttendanceCorrectionRequestViewSet`.

### 4. Strategic Performance (M4)
- New `PerformanceDashboardScreen` with KPI progress bars.
- New `SelfAppraisalScreen` for employee ratings and comments.

### 5. Settings & Logout (M5)
- New `SettingsScreen` for app personalization and secure logout.
- Direct integration with `ApiService.logout()`.

### 6. Environment Hierarchy & Multi-Cloud
- Established a unified 4-tier environment structure:
    - **QA**: `harilibur.web.id` on IDCloudHost (Functional Testing).
    - **Staging**: `harikerja.web.id` on AWS (Identical to Prod for 1M user stress test).
    - **Production**: `harikerja.com` on AWS Enterprise.
- Updated [ApiService.dart](file:///d:/hr/hrms/mobile/lib/api/api_service.dart) to handle environment-specific domains via `--dart-define`.
- All `mobile/` automation scripts (`run_dev.ps1`, `run_e2e.ps1`, `run_tests.ps1`) are synchronized with this hardening phase.

## Verification Results

### Automated Tests (Real Backend)
Executed **35+ tests** across all logic modules and user flows. All tests now communicate directly with the local development server.
`pwsh ./run_tests.ps1`
`pwsh ./run_e2e.ps1`

| Module | Test File | Status |
| :--- | :--- | :--- |
| Infrastructure | `test/infrastructure_test.dart` | ✅ PASSED |
| E2E Flow | `test/e2e_test.dart` | ✅ PASSED |
| Profile | `test/profile_logic_test.dart` | ✅ PASSED |
| Attendance | `test/attendance_logic_test.dart` | ✅ PASSED |
| Performance | `test/performance_logic_test.dart` | ✅ PASSED |

**Total Pass Rate: 100% (Real Backend Sync)**

## Key Files Modified
- [ApiService.dart](file:///d:/hr/hrms/mobile/lib/api/api_service.dart)
- [SettingsScreen.dart](file:///d:/hr/hrms/mobile/lib/screens/settings_screen.dart)
- [e2e_test.dart](file:///d:/hr/hrms/mobile/test/e2e_test.dart)
- [HomeScreen.dart](file:///d:/hr/hrms/mobile/lib/screens/home_screen.dart)
- [ProfileEditScreen.dart](file:///d:/hr/hrms/mobile/lib/screens/profile_edit_screen.dart)
- [ProfileDocumentsScreen.dart](file:///d:/hr/hrms/mobile/lib/screens/profile_documents_screen.dart)
- [CorrectionRequestScreen.dart](file:///d:/hr/hrms/mobile/lib/screens/correction_request_screen.dart)
- [PerformanceDashboardScreen.dart](file:///d:/hr/hrms/mobile/lib/screens/performance_dashboard_screen.dart)
- [SelfAppraisalScreen.dart](file:///d:/hr/hrms/mobile/lib/screens/self_appraisal_screen.dart)

---

## 🚧 Future Hardening & Known Gaps

Post-audit verification identified the following areas for Phase M7:
- **I18n Completion**: Only 10% of strings are currently localized; full ARB migration is required.
- **Payslip Dynamism**: Current screen is a static mockup; needs integration with real backend list/detail endpoints.
- **Home Polishing**: "Recent Activity" and "Shift Info" are currently hardcoded and require dynamic API binding.
- **JWT Resilience**: Implementation of Refresh Token flow to handle 401 session expirations.
- **PDF Viewing**: Transition from console-logging to native `path_provider` + `open_file` implementation.
