# Walkthrough: Mobile (harikerja HRMS)

A Flutter-based employee self-service (ESS) portal featuring AI-powered biometric attendance and comprehensive self-service capabilities.

## 📱 Implementation Phases

### Phase 1: Biometric Attendance (Complete)
- **Face ID**: AI-powered biometric verification with liveness checks using `google_mlkit_face_detection`.
- **Geofencing**: Strict 100m GPS validation ensuring check-ins are on-site.
- **Core ESS**: Integrated Shift scheduling, Dashboard stats, and basic Profile management.

![Mobile Dashboard](./assets/mobile_preview.png)
![Face ID](./assets/mobile_face_id.png)

### Phase 2: Self-Service Expansion (Complete)
- **Leave Management**: Real-time balance tracking and new leave request submission.
- **Reimbursement Claims**: Direct expense submission with category support and status monitoring.
- **Compliance**: Verified Payslip visualization integrated with TER 2024 payroll data.

## 🛠 Testing & Compliance
- **Verification**: 100% success rate across 11 core tests (Unit + Widget).
- **Identity**: Token-based security and deep-sync with Unified Identity API.
- **Localization**: Full Indonesian and English language support.
