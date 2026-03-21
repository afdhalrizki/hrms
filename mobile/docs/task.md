# Master Task List: Mobile App (harikerja HRMS)

This checklist tracks the implementation of the Flutter-based employee self-service (ESS) portal, including hardware integrations and security.

## 👤 1. Employee Self-Service (ESS) Core
- [x] **Home Dashboard**: Quick access to attendance stats and latest payslips.
- [x] **Payslip Viewer**: Mobile-optimized visualization of ReportLab PDFs.
- [x] **Leave Management** (Phase 2): Real-time balance and new request submission.
- [x] **Reimbursement Claims** (Phase 2): Expense submission with category-based validation.
- [x] **Shift Schedule**: Personalized work calendar with real-time shift status.
- [ ] **Document Center**: View and download company policies and handbooks.

## 🔒 2. Security & Biometrics
- [x] **ML Kit Integration**: `google_mlkit_face_detection` for liveness checks.
- [x] **Liveness Detection**: UI blinks/movement verification before clock-in.
- [x] **Geofencing**: Strict GPS validation (100m radius) via backend sync.
- [ ] **Root/Jailbreak Detection**: Hardware integrity check before biometric submission.
- [ ] **Biometric Enrollment**: UI flow for initial face reference registration.

## 🚀 3. Advanced Roadmap & Infrastructure (Sync Phases)
- [ ] **Phase M1: Backend Alignment**: Fix API URLs and integrate real GPS (`geolocator`).
- [ ] **Phase M2: Attendance Lifecycle**: Implement Correction Requests and dynamic Clock-out.
- [ ] **Phase M3: Strategic Performance**: KPI Progress & Appraisal history screens.
- [ ] **Phase M4: Operational Feed**: Dynamic Activity list on Home screen.
- [ ] **Push Notifications**: Real-time alerts for leave/reimbursement approval status.
- [ ] **Offline Attendance Buffer**: Local caching for check-ins.
