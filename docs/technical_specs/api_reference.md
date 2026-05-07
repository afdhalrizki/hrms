# API Reference & Integration Guide

## 📚 Overview
Comprehensive API documentation for developers integrating with harikerja HRMS. All API endpoints require authentication and proper tenant context.

## 🔑 Authentication
### JWT Authentication
```http
POST /api/auth/login/
Content-Type: application/json
X-Tenant: company1.localhost

{
  "email": "user@company.com",
  "password": "password123"
}

Response:
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "email": "user@company.com",
    "is_staff": true
  }
}
```

### Token Refresh
```http
POST /api/auth/token/refresh/
Content-Type: application/json

{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}

Response:
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

### Tenant Context Headers
All API requests must include tenant context:
```http
GET /api/employees/
X-Tenant: company1.localhost
Authorization: Bearer <access_token>
```

---

## 📊 Dashboard & Analytics
### Dashboard Statistics
- `GET /api/core/dashboard-stats/` - Get summary stats (total employees, attendance %, pending leaves, payroll totals).

### Tenant Settings & Branding
- `GET /api/tenant/settings/` - Get current tenant branding settings (logo, primary color, company name).

---

## 👥 User Management API
### Employee Endpoints
- `GET /api/employees/` - List employees with pagination. Supports `?lite=true` for minimal data.
- `POST /api/employees/` - Create new employee. Optional: `create_user: true` to provision login.
- `GET /api/employees/{id}/` - Get employee details.
- `PATCH /api/employees/{id}/` - Update employee profile (supports document uploads via Multipart).
- `DELETE /api/employees/{id}/` - Delete employee (soft delete).

### Self-Service Endpoints
- `GET /api/users/me/` - Get current user profile and linked employee data.

---

## 📅 Attendance API
### Clock In/Out
```http
POST /api/attendance/
Content-Type: application/json
X-Tenant: company1.localhost
Authorization: Bearer <access_token>

{
  "latitude_in": -6.2088,
  "longitude_in": 106.8456,
  "check_in": "08:00:00",
  "photo_in": "base64_encoded_image",
  "platform": "mobile"
}
```

### Leave & Overtime
- `GET /api/leave-requests/` - List leave requests.
- `POST /api/leave-requests/` - Create leave application.
- `PATCH /api/leave-requests/{id}/` - Approve/Reject leave with `action: "APPROVED"` and `comment`.
- `GET /api/leave-balances/` - Get current leave quota and usage.
- `GET /api/overtime/` - List overtime requests.
- `POST /api/overtime/` - Request overtime.

### Corrections
- `GET /api/attendance-corrections/` - List correction requests.
- `POST /api/attendance-corrections/` - Request a clock-in/out time correction.

### Export & Reports
- `GET /api/attendance/download_pdf/` - Download individual attendance report (PDF).
- `GET /api/attendance/export_xlsx/` - Export attendance recap (Excel).
- `GET /api/attendance/export_csv/` - Export summary (CSV).

---

## 💰 Payroll API
### Payslip Management
- `GET /api/payslips/` - List available payslips.
- `GET /api/payslips/{id}/download_pdf/` - Download payslip as PDF.
- `GET /api/payslips/{id}/download_docx/` - Download payslip as DOCX.
- `GET /api/payslips/export_recap_xlsx/` - Export payroll recap for a period.

---

## 📈 Performance API
### KPI & Appraisals
- `GET /api/kpis/` - List available KPIs.
- `GET /api/kpi-targets/` - View assigned employee targets.
- `GET /api/appraisals/` - List performance appraisals.
- `POST /api/appraisal-reviews/` - Submit a review or self-appraisal.
- `GET /api/appraisals/{id}/download_pdf/` - Download appraisal summary.

---

## 🔄 Workflow Engine
- `GET /api/workflow-configs/` - List workflow configurations for modules.
- `GET /api/workflow-stages/` - View approval stages.
- `GET /api/workflow-actions/` - View audit history of workflow actions.

---

## 🏢 System Administration
### Public Registration
- `POST /api/public/signup/` - Public signup for new company tenants.
- `GET /api/internal/registrations/` - List pending registrations (Global Admin).

### Security & Auditing
- `GET /api/api-keys/` - Manage API keys for external integration.
- `GET /api/audit-logs/` - View system-wide audit trail (Requires `view_audit_logs`).

---

## ⚠️ Rate Limits & Quotas
- **Rate Limit**: Default 100 requests per minute per user.
- **Quota Enforcement**: Employee creation is blocked if the tenant's plan capacity is exceeded.

## 🚨 Error Handling
### Common Error Codes
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions or quota exceeded)
- `404` - Not Found
- `429` - Too Many Requests (rate limit exceeded)

### Quota & Subscription Error Examples
```json
{
  "error": "Employee quota exceeded for your FREE plan (Limit: 10).",
  "code": "QUOTA_EXCEEDED"
}
```

```json
{
  "error": "Your subscription has expired. Please renew to restore full access.",
  "code": "SUBSCRIPTION_EXPIRED_READ_ONLY"
}
```

```json
{
  "error": "Your subscription is suspended due to non-payment.",
  "code": "SUBSCRIPTION_SUSPENDED"
}
```

---

---

**Last Updated**: May 7, 2026  
**API Version**: v1.5.0  
**Base URL**: https://api.harikerja.com  
