# harikerja HRMS Mobile (Flutter)

The employee self-service (ESS) application for the **harikerja HRMS** ecosystem. This Flutter app provides a secure, biometric-enabled portal for employees to manage their attendance, work schedules, and payroll.

## 📱 Key Features

- **Biometric Face Recognition**: AI-powered attendance verification with liveness checks using Google ML Kit.
- **Smart Geofencing**: High-accuracy GPS validation to ensure attendance records are within office boundaries.
- **Integrated Identity**: Real-time synchronization with the unified backend identity system (Employee NIK, Role, Department).
- **ESS Profile Management**: Self-service portal for updating contact info and uploading KTP/NPWP documents using camera capture.
- **Attendance Corrections**: Request workflow for fixing missed or incorrect logs directly from the mobile app.
- **Strategic Performance**: Personal KPI dashboard with progress visualization and self-appraisal submissions.
- **Shift & Schedule**: Personal work calendar with real-time shift status.
- **Dynamic Payslips**: View and download payroll details with TER 2024 compliance data.
- **Leave Management**: Submit leave requests (Annual, Permission, Sick) and track balances in real-time.
- **Reimbursement Claims**: Easy expense submission with category-based validation and status tracking.

## 🖼 UI Previews
### Employee Dashboard
![Mobile Dashboard](../docs/assets/mobile_preview.png)
*Premium glassmorphism dashboard with real-time shift and attendance tracking.*

### Face ID Attendance
![Face ID Verification](../docs/assets/mobile_face_id.png)
*AI-powered face recognition with liveness detection for secure clock-in.*

## 🛠 Tech Stack

- **Framework**: Flutter 3.19+
- **Biometrics**: Google ML Kit (Face Detection)
- **Maps/Location**: Geolocator API (High Accuracy)
- **Media**: Camera & Image Picker (Documents)
- **Storage**: Flutter Secure Storage (JWT)
- **Fonts**: Plus Jakarta Sans (Google Fonts)

---

## 1. Getting Started

### Prerequisites
- **Flutter SDK**: 3.19 or later.
- **Android Studio / Xcode**: For emulator or physical device testing.
- **Backend Running**: Ensure the backend is active (e.g., run `.\run_dev.ps1` in the backend directory).

### Setup
```powershell
cd mobile
flutter pub get
```

### Running the App
```powershell
flutter run
```

---

## 2. API Integration & Multi-Tenancy

The app handles multi-tenancy by injecting custom headers into every request via `ApiService`:
- `X-Tenant-Domain`: Standard tenant routing.
- `Host`: Required for `django-tenants` schema isolation in development.

| Target | API URL (Local Dev) | Notes |
| :--- | :--- | :--- |
| **Android Emulator** | `http://10.0.2.2:8000/api` | Default configuration |
| **iOS Simulator** | `http://localhost:8000/api` | |
| **Physical Device** | `http://<your-ip>:8000/api` | Same Wi-Fi required |
| **Staging** | `https://harikerja.web.id/api` | Requires production build |

---

## 3. Testing

Run the full mobile test suite using the one-click script:
```powershell
# Run from workspace root:
pwsh .\mobile\run_tests.ps1

# Or run from mobile directory:
pwsh ./run_tests.ps1
```
**Status**: ✅ **19 tests passed** (100% success). Includes Infrastructure, Profile Logic, Attendance Corrections, and Performance Appraisals.

---
**Branding Note**: This project was rebranded to **harikerja** on March 16, 2026.
