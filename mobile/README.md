# harikerja HRMS Mobile (Flutter)

The employee self-service (ESS) application for the **harikerja HRMS** ecosystem. This Flutter app provides a secure, biometric-enabled portal for employees to manage their attendance, work schedules, and payroll.

## 📱 Key Features

- **Biometric Face Recognition**: AI-powered attendance verification with liveness checks using Google ML Kit.
- **Smart Geofencing**: High-accuracy GPS validation to ensure attendance records are within office boundaries.
- **Integrated Identity**: Real-time synchronization with the unified backend identity system (Employee NIK, Role, Department).
- **ESS Profile Management**: Self-service portal for updating contact info and uploading KTP/NPWP documents.
- **Attendance Corrections**: Request workflow for fixing missed or incorrect logs directly from the mobile app.
- **Strategic Performance**: Personal KPI dashboard with progress visualization and self-appraisal submissions.
- **Shift & Schedule**: Personal work calendar with real-time shift status.
- **Dynamic Payslips**: View and download payroll details with TER 2024 compliance data.
- **Leave Management**: Submit leave requests (Annual, Permission, Sick) and track balances in real-time.
- **Reimbursement Claims**: Easy expense submission with category-based validation and status tracking.
- **Account Settings**: App personalization, language preferences, and secure logout management.

### 📊 Feature Status & Maturity
For a detailed audit of implemented vs. mocked features, see [**Feature Audit & Gap Analysis**](./docs/feature_audit.md).

| Module | Status | Dynamic? |
| :--- | :--- | :--- |
| Auth & Face ID | ✅ Ready | Yes |
| Profile & Docs | ✅ Ready | Yes |
| Attendance Logic | ✅ Ready | Yes |
| Leave & Reimb | ✅ Ready | Yes |
| Performance | ✅ Ready | Yes |
| Payslips | ✅ Ready | Yes |
| L10n | ⚠️ Polishing | No |

### 📱 Flutter UI Previews


| ![Mobile Dashboard](../docs/assets/mobile_preview.png) | ![Face ID Verification](../docs/assets/mobile_face_id.png) |

## 🛠 Tech Stack

- **Framework**: Flutter 3.19+
- **Biometrics**: Google ML Kit (Face Detection)
- **Maps/Location**: Geolocator API (High Accuracy)
- **Media**: Camera & Image Picker (Documents)
- **Storage**: Flutter Secure Storage (JWT)
- **Fonts**: Plus Jakarta Sans (Google Fonts)

---

## 📦 Getting Started

### Prerequisites
- **Flutter SDK**: 3.19 or later.
- **Backend Running**: Ensure the backend is active on Port 8000.

### Setup
```powershell
flutter pub get
```

## 🚀 Running the Platform

```bash
node scripts/run_dev.mjs
```

## 🌐 Deployment & Infrastructure

The app handles multi-tenancy via `X-Tenant-Domain` and environment builds.

| Tier | API URL / Domain | Purpose |
| :--- | :--- | :--- |
| **Dev** | `http://10.0.2.2:8000/api` | Local Development |
| **QA** | `https://harikerja.web.id/api` | Biznet / IDCH / Hostinger |
| **Staging** | `https://harikerja.my.id/api` | Biznet Scaling Test |
| **Production** | `https://harikerja.com/api` | Biznet/AWS Enterprise |

## 🧪 Testing Standard

The mobile application has a comprehensive test suite covering core logic and E2E flows with **100% pass rate** across **155 robust tests**.

### Unit & Logic Tests - 132 Tests
```bash
node scripts/run_unit_tests.mjs
```

### End-to-End Testing (E2E) - 23 Tests

**Run with mocked API (Isolated):**
```bash
node scripts/run_e2e_tests.mjs
```

**Run with real integrated API and Database:**
```bash
node scripts/run_e2e_tests.mjs --integrated
```

### Run All Tests (Unit + E2E)
```bash
node scripts/run_tests.mjs
```

## 📚 Technical Documentation

For in-depth technical details, please refer to the platform-wide documentation in the root `docs/` directory:
- [**Architecture Guides**](../docs/architecture/)
- [**Business Strategy**](../docs/business_strategy/)
- [**Workflows & Features**](../docs/workflows_features/)
- [**Technical Specifications**](../docs/technical_specs/)

---
**Status**: 🏆 **Platform Gold Release v1.3.0 (March 31, 2026)**. Scalability Blueprint & Mobile Experience Standardized.
**Branding Note**: This project was rebranded to **harikerja** on March 16, 2026.

