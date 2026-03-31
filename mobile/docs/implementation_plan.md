# Ultra-Detailed Implementation Plan: Mobile (Flutter)

This document serves as the technical blueprint and record of completion for the **harikerja HRMS** Flutter mobile application.

## 🏗 1. Flutter Architecture Patterns
Standardizing the project structure for scalability and testability.

```bash
lib/
├── api/             # API Service (Http) and 401 Refresh Interceptors
├── models/          # Data Models (JSON Serializable)
├── providers/       # State Management (Provider)
├── screens/         # UI Screen widgets (Localized)
├── widgets/         # Reusable atomic UI components
├── services/        # Hardware services (GPS, Biometrics, Storage)
└── utils/           # Formatters, Constants, and I18n helpers
```

## 🔐 2. Biometric & Hardware Pipelines
### Face ID & Liveness Detection
- **Engine**: `google_mlkit_face_detection`.
- **Workflow**:
    1. Activate front camera.
    2. Randomly prompt for "Blink" or "Turn Head" to verify liveness.
    3. Capture frame upon success and convert to base64 for backend verification.
- **Failover**: Fallback to PIN/Password if hardware biometrics are unavailable.

### Geofencing Strategy
- **Service**: `geolocator` with high-accuracy settings.
- **Logic**: Fetch coordinates during `check-in` action and send as headers to the backend. The backend performs the final Haversine calculation against the branch radius.

## 🔄 3. State Management & API Sync
- **State**: Central `AuthProvider` managing JWT life-cycle.
- **Resilience**: Transparent 401 retry-interceptor in `ApiService` using refresh tokens.
- **Persistence**: `flutter_secure_storage` for JWT integrity.

## 🎨 4. Flutter UI Design Tokens
- **Theme**: Premium Glassmorphism-inspired design consistent with the web interface.
- **Colors**: `0xFF0F172A` (Background), `0xFF6366F1` (Primary).
- **I18n**: Multi-language support (EN/ID) via `AppLocalizations`.

## 🚀 5. Deployment Architecture (4-Tier)

The mobile application is synchronized with the harikerja 4-tier environment hierarchy:

| Tier | Purpose | Domain | Hosting |
| :--- | :--- | :--- | :--- |
| **Dev** | Prototyping | `localhost` | Docker |
| **QA** | Functional UAT | `qa.harikerja.web.id` | IDCloudHost |
| **Staging** | 1M Stress Test | `staging.harikerja.web.id` | AWS |
| **Prod** | Enterprise | `harikerja.com` | AWS |

## ✅ 6. Roadmap Completion Summary

### Phase M1-M3: Core Infrastructure & ESS (DONE)
- Optimized headers, precision GPS, and standardized Auth endpoints.
- Self-service profile updates and biometric KTP/NPWP uploads.
- Comprehensive clock-in/out logic with geofencing and correction workflows.

### Phase M4-M5: Performance & Payslips (DONE)
- Dynamic KPI dashboards and self-appraisal submissions.
- Live payslip history fetching with native PDF support and TER 2024 compliance.

### Phase M6-M7: Quality Assurance & Hardening (DONE)
- 100% Pass Rate (24/24 Logic Tests) against live backend.
- Verified E2E flow (Login -> Dashboard -> Attendance -> Logout).
- JWT Refresh token flow and transparent 401 interceptor.

**Status**: ✅ **COMPLETED**. The mobile application is now in full synchronization with the harikerja stack.

