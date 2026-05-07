# Feature Map and Platform Comparison

This document provides a comprehensive overview of the HRMS features and their availability across the Web (Frontend) and Mobile (Flutter) platforms.

## 1. Global Feature Overview

The HRMS platform is divided into several core modules:

- **Core/HR**: Employee data, documents, organizational structure.
- **Attendance**: Real-time tracking, geolocation, leaves, overtime, and corrections.
- **Payroll**: Automatic calculations, tax processing, and payslip distribution.
- **Performance**: KPI tracking, self-appraisals, and management reviews.
- **SaaS Admin**: Tenant registration, subscription management, and system auditing.

---

## 2. Platform Comparison Matrix

| Module | Feature | Web (Admin/Staff) | Web (Employee) | Mobile (Employee) |
| :--- | :--- | :---: | :---: | :---: |
| **Auth** | Login / Logout | ✅ | ✅ | ✅ |
| | Registration (SaaS) | ✅ | ❌ | ❌ |
| | Profile Update | ✅ | ✅ | ✅ |
| **HR** | Employee Management (CRUD) | ✅ | ❌ | ❌ |
| | Document Management | ✅ | ✅ | ✅ (Upload) |
| | Org Chart / Branches | ✅ | ✅ | ❌ |
| **Attendance** | Clock In/Out (GPS) | ✅ | ✅ | ✅ (Primary) |
| | Leave Application | ✅ | ✅ | ✅ |
| | Leave Approval | ✅ | ❌ | ❌ |
| | Overtime Requests | ✅ | ✅ | ✅ |
| | Attendance Corrections | ✅ | ✅ | ✅ |
| **Payroll** | Process Payroll | ✅ | ❌ | ❌ |
| | View/Download Payslips | ✅ | ✅ | ✅ |
| **Performance** | Setup KPIs | ✅ | ❌ | ❌ |
| | Self-Appraisal | ✅ | ✅ | ✅ |
| | Manager Review | ✅ | ❌ | ❌ |
| **Analytics** | Dashboard Summary | ✅ | ✅ | ✅ |
| | Detailed Export (XLSX/PDF) | ✅ | ✅ | ✅ (Limited) |
| | System Audit Logs | ✅ | ❌ | ❌ |

---

## 3. Page & Screen Mapping

### Web (Frontend) Routes
| Route | Visibility | Auth Required |
| :--- | :--- | :---: |
| `/login` | Public | ❌ |
| `/signup` | Public | ❌ |
| `/registration` | Public | ❌ |
| `/profile` | Protected | ✅ |
| `/employees` | Protected (Admin) | ✅ |
| `/attendance` | Protected | ✅ |
| `/leaves` | Protected | ✅ |
| `/payroll` | Protected | ✅ |
| `/analytics` | Protected (Admin) | ✅ |
| `/settings` | Protected (Admin) | ✅ |

### Mobile (Flutter) Screens
| Screen Name | Purpose | Auth Required |
| :--- | :--- | :---: |
| `LoginScreen` | Authentication | ❌ |
| `HomeScreen` | Dashboard & Quick Actions | ✅ |
| `AttendanceScreen` | Clock In/Out (Map) | ✅ |
| `LeaveListScreen` | History & Status | ✅ |
| `LeaveApplyScreen` | Submit new leave | ✅ |
| `PayslipScreen` | List & View Payslips | ✅ |
| `PerformanceScreen` | KPI & Self-Review | ✅ |
| `ProfileEditScreen` | Personal Data & Docs | ✅ |

---

## 4. API & Authorization Matrix

All protected endpoints require the `Authorization: Bearer <token>` header and `X-Tenant` context.

| Endpoint | Method | Platform | Required Permission | Auth |
| :--- | :--- | :--- | :--- | :---: |
| `/auth/login/` | `POST` | All | `AllowAny` | ❌ |
| `/public/signup/` | `POST` | Web | `AllowAny` | ❌ |
| `/users/me/` | `GET` | All | `IsAuthenticated` | ✅ |
| `/employees/` | `GET` | Web | `manage_employees` | ✅ |
| `/employees/` | `POST` | Web | `manage_employees` | ✅ |
| `/employees/{id}/` | `PATCH` | All | `IsAuthenticated` (Self or Admin) | ✅ |
| `/attendance/` | `GET` | All | `IsAuthenticated` (Self) | ✅ |
| `/attendance/` | `POST` | All | `IsAuthenticated` (Self) | ✅ |
| `/leave-requests/` | `POST` | All | `IsAuthenticated` (Self) | ✅ |
| `/leave-requests/{id}/`| `PATCH` | Web | `manage_leaves` | ✅ |
| `/payslips/` | `GET` | All | `IsAuthenticated` (Self) | ✅ |
| `/payslips/{id}/pdf/` | `GET` | All | `IsAuthenticated` (Self) | ✅ |
| `/core/dashboard-stats/`| `GET` | All | `view_analytics` | ✅ |
| `/tenant/settings/` | `PATCH` | Web | `manage_tenant_settings` | ✅ |

---

## 5. Summary of Platform Restrictions

1.  **Mobile is for Employees**: The mobile app is streamlined for daily operational tasks. It does not include management features (approving others' leaves, processing payroll, or system configuration).
2.  **Web is for Admin & Self-Service**: The web portal is the full-featured interface. It serves both the administrators (HR Managers, Owners) and employees who prefer a desktop view.
3.  **Public Access**: Only landing pages, pricing, and the registration/login portals are accessible without an account. Once a tenant is identified, the system enforces strict isolation.
