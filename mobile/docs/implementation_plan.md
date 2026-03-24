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

## 🚀 6. Phased Roadmap: Full Backend Parity
### Phase M1: Infrastructure Alignment & Real-GPS
- **API URL Correction**: Ensure `ApiService` correctly handles dynamic tenant subdomains and `/api/` prefixes.
- **Real Geolocation**: Integrate `geolocator` with high-accuracy settings for clock-in/out.
- **Header Injection**: Enforce `X-Tenant-Domain` and `Authorization` headers in all requests.

### Phase M2: ESS Profile & Documents (NEW)
- **Profile Edit**: [NEW SCREEN] `ProfileEditScreen` for self-service fields (Phone, Address, PTKP Status).
- **Document Manager**: [NEW SCREEN] `ProfileDocumentsScreen` for KTP/NPWP uploads using `multipart/form-data`.
- **Validation**: Align with backend `EmployeeProfileSerializer` field locks.

### Phase M3: Attendance Lifecycle & Corrections (NEW)
- **Clock-Out**: Refine `submitAttendance` to handle `check_out` timestamps and geofencing.
- **Correction Requests**: [NEW SCREEN] `CorrectionRequestScreen` for justified adjustments to attendance logs.
- **Workflow Feed**: Track `ATTENDANCE_CORRECTION` approval status (Pending/Approved/Rejected).

### Phase M4: Strategic Performance (NEW)
- **KPI progress**: [NEW SCREEN] Visual dashboard for personal KPI targets and real-time attainment.
- **Self-Appraisal**: [NEW SCREEN] Submit ratings and feedback for active appraisal periods.
- **History**: View historical review results once appraisal status is `COMPLETED`.

### Phase M5: Quality Assurance & Testing
- **Unit Tests**: Implement 100% coverage for API Services and Data Models.
- **Widget Tests**: Verify critical UI flows (Clock-in, Leave submission, Profile Edit).
- **Parity Check**: Ensure all logic mirrors `test_correction.py` and `test_performance.py` from the backend.
