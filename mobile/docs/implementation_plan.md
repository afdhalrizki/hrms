# Ultra-Detailed Implementation Plan: Mobile (Flutter) reference

This document serves as the technical blueprint for the **harikerja HRMS** Flutter mobile application.

## 🏗 1. Flutter Architecture Patterns
Standardizing the project structure for scalability and testability.

```bash
lib/
├── api/             # API Service (Dio/Http) and Interceptors
├── models/          # Data Models (JSON Serializable)
├── providers/       # State Management (Provider/Riverpod/BLoC)
├── screens/         # UI Screen widgets
├── widgets/         # Reusable atomic UI components
├── services/        # Hardware services (GPS, Biometrics, Storage)
└── utils/           # Formatters, Constants, and I18n helpers
```

## 🔐 2. Biometric & Hardware Pipelines
### Face ID & Liveness Detection
- **Engine**: `google_mlkit_face_detection`.
- **Workflow**:
    1. Activate front camera.
    2. Randomly prompt for "Blink" or "Turn Head".
    3. Capture frame upon success and convert to base64 for backend verification.
- **Failover**: Fallback to PIN/Password if hardware biometrics are unavailable.

### Geofencing Strategy
- **Service**: `geolocator` with high-accuracy settings.
- **Logic**: Fetch coordinates during `check-in` action and send as headers to the backend. The backend performs the final Haversine calculation against the branch radius.

## 🔄 3. State Management & API Sync
- **State**: Use a central `AuthProvider` to manage session life-cycle and tenant context.
- **Persistance**: `flutter_secure_storage` for JWT and sensitive metadata.
- **API Interceptor**: Automatically inject `X-Tenant-Domain` and `Authorization` headers.

## 🎨 4. Flutter UI Design Tokens
- **Theme**: Consistent with the web's premium feel.
- **Colors**: `0xFF0F172A` (Background), `0xFF6366F1` (Primary).
- **Icons**: `Lucide` or `Cupertino` for a modern, clean interface.
- **Feedback**: Vibrate and Haptic feedback for successful clock-ins.

## ✅ 5. Testing & Validation
- **Unit Tests**: Coverage for `ApiService` and data parsing in `Models`.
- **Widget Tests**: Verification of form validation and loading states.
- **Integration Tests**: Full flow of Login -> Check-in -> Logout using `integration_test` package.
