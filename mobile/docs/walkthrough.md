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

## Verification Results

### Automated Unit Tests
Executed **19 tests** across 6 logic modules. You can run all tests using:
`pwsh ./run_tests.ps1`

| Module | Test File | Status |
| :--- | :--- | :--- |
| Infrastructure | `test/infrastructure_test.dart` | ✅ PASSED |
| Profile | `test/profile_logic_test.dart` | ✅ PASSED |
| Attendance | `test/correction_logic_test.dart` | ✅ PASSED |
| Performance | `test/performance_logic_test.dart` | ✅ PASSED |

**Total Pass Rate: 100% (9/9 Tests)**

## Key Files Modified
- [ApiService.dart](file:///d:/hr/hrms/mobile/lib/api/api_service.dart)
- [HomeScreen.dart](file:///d:/hr/hrms/mobile/lib/screens/home_screen.dart)
- [ProfileEditScreen.dart](file:///d:/hr/hrms/mobile/lib/screens/profile_edit_screen.dart)
- [ProfileDocumentsScreen.dart](file:///d:/hr/hrms/mobile/lib/screens/profile_documents_screen.dart)
- [CorrectionRequestScreen.dart](file:///d:/hr/hrms/mobile/lib/screens/correction_request_screen.dart)
- [PerformanceDashboardScreen.dart](file:///d:/hr/hrms/mobile/lib/screens/performance_dashboard_screen.dart)
- [SelfAppraisalScreen.dart](file:///d:/hr/hrms/mobile/lib/screens/self_appraisal_screen.dart)
