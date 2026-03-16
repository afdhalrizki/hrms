# harikerja HRMS Mobile (Flutter)

The employee self-service (ESS) application for the **harikerja HRMS** ecosystem. This Flutter app provides a secure, biometric-enabled portal for employees to manage their attendance, work schedules, and payroll.

## 📱 Key Features

- **Biometric Face Recognition**: AI-powered attendance verification with liveness checks using Google ML Kit.
- **Smart Geofencing**: High-accuracy GPS validation to ensure attendance records are within office boundaries.
- **Integrated Identity**: Real-time synchronization with the unified backend identity system (Employee NIK, Role, Department).
- **Shift & Schedule**: Personal work calendar with real-time shift status.
- **Dynamic Payslips**: View and download payroll details with TER 2024 compliance data.

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
- **Maps/Location**: Geolocator API
- **Storage**: Flutter Secure Storage (JWT)
- **Fonts**: Plus Jakarta Sans (Google Fonts)

---

## 1. Getting Started

### Prerequisites
- **Flutter SDK**: 3.19 or later.
- **Android Studio / Xcode**: For emulator or physical device testing.
- **Backend Running**: Ensure the backend is active (e.g., run `.\up.ps1 dev` in the project root).

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

## 2. API Integration & Environments

The app is designed to connect to different environments. You can adjust the `baseUrl` in `lib/api/api_service.dart`:

| Target | API URL (Local Dev) | Notes |
| :--- | :--- | :--- |
| **Android Emulator** | `http://10.0.2.2:8000/api` | Default configuration |
| **iOS Simulator** | `http://localhost:8000/api` | |
| **Physical Device** | `http://<your-ip>:8000/api` | Same Wi-Fi required |
| **Staging** | `https://harilibur.com/api` | Requires production build |

> [!TIP]
> Ensure the **Backend** is running using `.\up.ps1 dev` before starting the mobile app for local testing.

---

## 3. Testing

Run the mobile test suite (API logic & Widgets):
```bash
flutter test
```
**Status**: All core flows verified with manual mocks and unit tests.

---
**Branding Note**: This project was rebranded to **harikerja** on March 16, 2026.
