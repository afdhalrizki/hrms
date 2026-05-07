# harikerja Full Stack Developer Guide

Welcome to the harikerja development team! This guide provides everything you need to build, test, and deploy features across our Backend (Django), Frontend (Next.js), and Mobile (Flutter) stacks.

---

## 🛠 Prerequisites & Setup

### 1. Requirements
- **Runtime**: Node.js 20+, Python 3.12+, Flutter SDK 3.0+
- **Database**: PostgreSQL 14+, Redis 7+
- **Tools**: Docker & Docker Compose

### 2. Rapid Local Setup
We use `up.mjs` as our primary orchestration tool. It automates environment checks, dependency installation, and service startup.

```bash
# Start everything (Backend + Frontend) with test data
node up.mjs --seed

# Options:
# --skip-docker : Use local DB instead of Docker
# --coverage    : Enable test coverage tracking
# --workers=N   : Set number of parallel test workers
```

---

## 🏗 Project Architecture

### 🛡 Backend (Django) - `/backend`
- **Multi-Tenancy**: Powered by `django-tenants` (Shared Database, Isolated Schemas).
- **API**: Django REST Framework (DRF).
- **Auth**: JWT via `rest_framework_simplejwt`.
- **RBAC**: Custom permission system in `core.permissions`.

### 🌐 Frontend (Web) - `/frontend`
- **Framework**: Next.js 16 (App Router).
- **Styling**: Tailwind CSS v4 + Framer Motion.
- **I18n**: `next-intl` (English & Indonesian).
- **API Fetching**: Custom `apiFetch` wrapper in `src/lib/api.ts` handles tenant context and token refresh.

### 📱 Mobile (App) - `/mobile`
- **Framework**: Flutter.
- **Core Features**: Geofencing, Face Detection (MLKit), Document Uploads.
- **API Client**: Centralized `ApiService` in `lib/api/api_service.dart`.

---

## 🚀 Adding a New Feature (Full Stack)

### Step 1: Backend Model & API
1. Create a new app: `python manage.py startapp <feature_name>`
2. Add to `TENANT_APPS` in `config/settings.py`.
3. Inherit from `AuditModel` for automatic change tracking.
4. Implement `TenantIsolationMixin` in your ViewSets.

### Step 2: Frontend Implementation
1. Add new route in `src/app/[locale]/<feature_name>/page.tsx`.
2. Use `apiFetch` to interact with the backend.
3. Add translations in `messages/id.json` and `messages/en.json`.

### Step 3: Mobile Implementation
1. Add a new screen in `lib/screens/`.
2. Add the corresponding endpoint method in `ApiService`.
3. Register the route in `main.dart`.

---

## 🧪 Testing Guidelines

### Backend Testing (Pytest)
```bash
cd backend
pytest --cov=.
```

### Frontend Testing (Vitest & Playwright)
```bash
cd frontend
npm run test      # Unit/Integration
npx playwright test # E2E
```

### Mobile Testing
```bash
cd mobile
flutter test
```

### Integrated Test Suite
To run all tests (Backend + Frontend + E2E) simultaneously:
```bash
node up.mjs --integrated
```

---

## 🏢 Multi-Tenant Development
The system identifies tenants by **hostname**.
- **Local Dev**: `localhost` (Public), `client1.localhost:3000` (Tenant).
- **Headers**: Use `X-Tenant-Domain` on Mobile or `X-Tenant` in E2E tests to specify context.

---

## 🔐 Security & Best Practices
- **Never** hardcode tenant IDs; always derive from `request.tenant`.
- Use **Services** for business logic; keep Models and Views thin.
- Always implement **RBAC** by setting `required_rbac_permission` in ViewSets.
- Use **Select Related / Prefetch Related** to avoid N+1 query problems.

---

**Last Updated**: May 7, 2026  
**Status**: Active  
**Orchestration**: `node up.mjs`
