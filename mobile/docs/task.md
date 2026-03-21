# Tasks: Mobile App (harikerja HRMS)

This checklist tracks the implementation of the Flutter-based employee self-service (ESS) portal.

## Core Mobile Infrastructure
- [x] **Flutter Foundation**: Initialization with Multi-tenant Login infrastructure.
- [x] **Secure Storage**: Integration for JWT and sensitive metadata management.
- [x] **Tenant Sync**: Automated API discovery based on tenant domain.

## Biometric Attendance (Face ID)
- [x] **ML Kit Integration**: `google_mlkit_face_detection` for liveness checks.
- [x] **Liveness Detection**: UI blinks/movement verification before clock-in.
- [x] **Geofencing**: Strict GPS validation (100m radius) enforced via backend sync.

## Employee Self-Service (ESS)
- [x] **Home Dashboard**: Quick stats on shifts, attendance, and latest payslips.
- [x] **Payslip Viewer**: Mobile-optimized visualization of ReportLab PDFs.
- [x] **Leave Management** (Phase 2): Real-time balance and new request submission.
- [x] **Reimbursement Claims** (Phase 2): Expense submission with category-based validation.
- [x] **Shift Schedule**: Personalized work calendar with real-time shift status.

## Verification & Hardening
- [x] **Unit & Widget Testing**: 100% success rate on 11 core verification scenarios.
- [x] **MethodChannel Mocks**: Implemented for testing hardware-dependent logic.
- [x] **Identity Link**: Hydrating UI from the centralized `/api/users/me/` endpoint.
- [x] **Internationalization**: Full ID/EN support for the entire mobile interface.
