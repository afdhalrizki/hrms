# HRMS Mobile App (Flutter)

This is the employee self-service (ESS) mobile application for the HRMS SaaS platform, built with Flutter. It supports multi-tenancy, biometric attendance, and personal HR management.

## Features
- **Multi-Tenant Login**: Employees log in to their specific company domain.
- **Biometric Attendance**: Face recognition with liveness detection (blink/movement) via Google ML Kit.
- **Geofenced Check-in**: GPS validation to ensure attendance is recorded within office boundaries.
- **Shift Viewer**: Personal work schedule and shift calendar with a premium glassmorphism UI.
- **Payslip Viewer**: Detailed monthly earnings and deductions breakdown.

## Prerequisites
- **Flutter SDK**: 3.x or higher
- **Dart SDK**: 3.x or higher
- **Android Studio / VS Code**: With Flutter and Dart plugins installed
- **Android SDK / iOS environment**: For building and running the app

## 1. Installation

### Clone the repository and navigate to the mobile folder
```bash
cd mobile
```

### Install Dependencies
```bash
flutter pub get
```

## 2. Configuration

### API Connection
The app connects to the HRMS Backend. By default, it is configured to use `http://localhost:8000`. You can update the API base URL in `lib/services/api_service.dart`.

**Note for Emulator Users:**
- Android Emulator: Use `http://10.0.2.2:8000`
- iOS Simulator: Use `http://localhost:8000`

### Multi-Tenancy
On the login screen, users must provide their company domain (e.g., `company1`) which is used to route requests to the correct tenant schema in the backend.

## 3. Running the App

### Start the application
```bash
flutter run
```

## 4. Key Dependencies
- `google_mlkit_face_detection`: For AI-powered face liveness verification.
- `camera`: Real-time preview for attendance selfies.
- `geolocator`: High-accuracy GPS tracking for geofencing.
- `flutter_secure_storage`: Encrypted storage for authentication tokens.
- `google_fonts`: Premium typography (Plus Jakarta Sans).

## 5. Development & Testing
To run the automated test suite:
```bash
flutter test
```

---
**Status**: Milestone 🎉 Integrated with Phase 3 Face Recognition & Liveness Security.
