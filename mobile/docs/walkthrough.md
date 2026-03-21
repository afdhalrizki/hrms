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

## 🛠 Technical Reference for Mobile Developers
The mobile app is designed for security, offline resilience, and hardware-level performance.

### Core Technology Stack
- **Framework**: Flutter (Dart) for cross-platform efficiency.
- **State Management**: Provider-based architecture (moving towards Riverpod for complex flows).
- **Hardware Integration**: High-precision GPS and ML-enabled Computer Vision for biometrics.
- **Security**: Layered encryption for stored JWTs and root-detection guards.

### Advanced Logic
- **Identity Link**: Directly hydrates UI from the centralized `/api/users/me/` endpoint to ensure data parity with the web dashboard.
- **PDF Rendering**: High-performance Native PDF rendering for formal payslips.

---
**Status**: 🏆 Robust ESS Portal Baseline Established (March 21, 2026)
