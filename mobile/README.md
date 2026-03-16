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
- Flutter SDK 3.x
- Android SDK / iOS Environment

### Setup
```bash
cd mobile
flutter pub get
```

### Running the App
```bash
flutter run
```

---

## 2. API Integration

The app is pre-configured for local development connectivity:
- **Android Emulator**: Uses `http://10.0.2.2:8000`
- **iOS Simulator**: Uses `http://localhost:8000`

---

## 3. Testing

Run the mobile test suite (API logic & Widgets):
```bash
flutter test
```
**Status**: All core flows verified with manual mocks and unit tests.

---
**Branding Note**: This project was rebranded to **harikerja** on March 16, 2026.
