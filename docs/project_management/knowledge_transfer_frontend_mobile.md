# Frontend & Mobile Stack - Knowledge Transfer Document

This document provides a comprehensive overview of the technologies, features, and API integrations used in the harikerja HRMS Frontend (Web) and Mobile applications.

---

## 🌐 Frontend (Web) Application

### 🛠 Technology Stack
- **Framework**: [Next.js](https://nextjs.org/) (v16.2.4) using App Router.
- **Library**: [React](https://reactjs.org/) (v19.2.3).
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (v4) for layout and design, [Framer Motion](https://www.framer.com/motion/) for animations.
- **Internationalization**: `next-intl` for multi-language support (ID, EN).
- **Icons**: `lucide-react`.
- **Charts**: `recharts` for dashboard analytics.
- **State Management**: React Context API (`AuthContext`, `TenantContext`).
- **Data Fetching**: Native `fetch` with a custom wrapper (`apiFetch`) in `src/lib/api.ts`.
- **Testing**: Vitest (Unit/Integration), Playwright (E2E).

### 🚀 Key Features
1. **Multi-Tenant Dashboard**: Overview of company stats (Total employees, attendance, pending leaves).
2. **Employee Management**: Directory, profile viewing, and management (Staff only).
3. **Attendance Management**: Monitoring logs, shifts, schedules, and audit logs.
4. **Leave & Workflow**: Approval systems for leave requests and other office workflows.
5. **Payroll**: Generating and viewing payslips, managing payroll periods.
6. **Performance**: KPI tracking and employee appraisal reviews.
7. **Reimbursements**: Managing expense claims and categories.
8. **Admin Portal**: Tenant registrations and system-wide settings (Superadmin).
9. **Branding & Settings**: Customizing company logo, colors, and general configurations.

### 🔌 API Endpoints Usage (Frontend)

| Feature | Endpoint | Method | Purpose |
|---------|----------|--------|---------|
| **Auth** | `/auth/login/` | POST | Login and receive JWT tokens. |
| **Auth** | `/auth/token/refresh/` | POST | Refresh expired access tokens. |
| **Profile** | `/users/me/` | GET | Fetch current logged-in user details. |
| **Dashboard** | `/core/dashboard-stats/` | GET | Fetch statistical data for charts and cards. |
| **Employees** | `/employees/` | GET/POST | List and create employees. |
| **Attendance** | `/attendance/` | GET | View attendance logs. |
| **Attendance** | `/attendance/corrections/` | GET/POST | Manage attendance correction requests. |
| **Leaves** | `/leave-requests/` | GET/POST | Manage leave applications and approvals. |
| **Payroll** | `/payslips/` | GET | View employee payslips. |
| **Performance** | `/appraisals/` | GET/POST | Manage performance reviews. |
| **Settings** | `/settings/branding/` | GET/POST | Update company branding (Logo, colors). |

---

## 📱 Mobile Application

### 🛠 Technology Stack
- **Framework**: [Flutter](https://flutter.dev/) (SDK >=3.0.0).
- **API Client**: `http` package with custom `ApiService`.
- **Storage**: `flutter_secure_storage` (JWT tokens), `shared_preferences` (Settings).
- **Geolocation**: `geolocator` for location-based attendance.
- **Camera & AI**: `camera` and `google_mlkit_face_detection` for face verification.
- **UI**: Material Design 3, `google_fonts`.
- **Testing**: Flutter Test, Integration Test (E2E).

### 🚀 Key Features
1. **Attendance with Face ID**: Clock-in/out using GPS and Face Recognition.
2. **Self-Service Profile**: Viewing and editing personal info, uploading documents (KTP/NPWP).
3. **Leave Management**: Applying for leaves and checking status/balance.
4. **Reimbursement**: Submitting expense claims with receipt uploads.
5. **Payslip Viewer**: Downloading and viewing monthly payslips (PDF/DOCX).
6. **Performance Dashboard**: Tracking own KPIs and submitting self-appraisals.
7. **Schedule & Shift**: Viewing assigned work schedules and requesting corrections.

### 🔌 API Endpoints Usage (Mobile)

| Feature | Endpoint | Method | Purpose |
|---------|----------|--------|---------|
| **Auth** | `/auth/login/` | POST | Login with email, password, and tenant subdomain. |
| **Attendance** | `/attendance/` | POST | Submit clock-in/out with coordinates. |
| **Face Verification** | `/attendance/verify-face/` | POST | Verify user face during clock-in (if enabled). |
| **Profile** | `/employees/{id}/` | PATCH | Update profile details or upload documents. |
| **Leaves** | `/leave-requests/` | GET/POST | Apply for leave and view history. |
| **Leaves** | `/leave-balances/` | GET | Get remaining leave quota. |
| **Reimbursement** | `/reimbursements/` | GET/POST | Submit expense claims. |
| **Payroll** | `/payslips/` | GET | List available payslips. |
| **Payroll** | `/payslips/{id}/download_pdf/` | GET | Download specific payslip as PDF. |
| **Performance** | `/kpi-targets/` | GET | View assigned performance targets. |
| **Correction** | `/attendance-corrections/` | GET/POST | Request attendance data correction. |

---

## ⚙️ Common Core Systems

### 🔐 Authentication Flow
1. **Login**: User provides credentials + Tenant ID (on mobile) or Subdomain (on web).
2. **Tokens**: Backend returns `access` (short-lived) and `refresh` (long-lived) tokens.
3. **Storage**: Web uses `localStorage`, Mobile uses `FlutterSecureStorage`.
4. **Interceptors**: Both stacks have logic to automatically attach the `Authorization: Bearer <token>` header and handle 401 errors by attempting a token refresh.

### 🏢 Multi-Tenant Handling
The application uses **Domain-based Multi-tenancy**.
- **Web**: Identifies tenant from the hostname (e.g., `client1.harikerja.com`).
- **Mobile**: User inputs tenant name during login, stored and sent via `X-Tenant-Domain` or `Host` header.
- **Header**: Backend identifies the schema via the `Host` header or custom `X-Tenant` headers.

### 🌍 Internationalization (i18n)
- **Web**: Handled via `next-intl` with JSON messages in `frontend/messages/`.
- **Mobile**: Handled via Flutter's `intl` package with ARB files in `mobile/lib/l10n/`.
- **Supported Languages**: Indonesian (ID) and English (EN).

---

## 📋 Knowledge Transfer Checklist
- [ ] Understand the `apiFetch` wrapper (Web) and `ApiService` (Mobile).
- [ ] Familiarize with the `X-Tenant` header requirement for all requests.
- [ ] Explore the component-based architecture in `frontend/src/components/`.
- [ ] Review the screen flow in `mobile/lib/screens/`.
- [ ] Check `docs/api_reference.md` for detailed request/response schemas.
