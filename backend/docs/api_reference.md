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
POST /api/auth/refresh/
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

## 👥 User Management API
### Employee Endpoints
- `GET /api/employees/` - List employees with pagination
- `POST /api/employees/` - Create new employee
- `GET /api/employees/{id}/` - Get employee details
- `PUT /api/employees/{id}/` - Update employee
- `PATCH /api/employees/{id}/` - Partial update
- `DELETE /api/employees/{id}/` - Delete employee (soft delete)

### Self-Service Endpoints
- `GET /api/users/me/` - Get current user profile
- `PUT /api/users/me/` - Update personal information
- `POST /api/users/me/documents/` - Upload documents (KTP, NPWP)
- `GET /api/users/me/documents/` - List user documents

### Example: Create Employee
```http
POST /api/employees/
Content-Type: application/json
X-Tenant: company1.localhost
Authorization: Bearer <access_token>

{
  "nik": "EMP001",
  "fullname": "John Doe",
  "email": "john@company.com",
  "department_id": 1,
  "role_id": 1,
  "golongan_id": 1,
  "join_date": "2026-01-01",
  "ktp_number": "1234567890123456",
  "ptkp_status": "TK/0"
}
```

## 📅 Attendance API
### Clock In/Out
```http
POST /api/attendance/clock-in/
Content-Type: application/json
X-Tenant: company1.localhost
Authorization: Bearer <access_token>

{
  "latitude": -6.2088,
  "longitude": 106.8456,
  "photo": "base64_encoded_image",
  "branch_id": 1,
  "verification_method": "FACE"
}

Response:
{
  "id": 123,
  "employee_id": 1,
  "date": "2026-03-31",
  "check_in": "08:00:00",
  "status": "PRESENT",
  "liveness_verified": true,
  "distance_from_branch": 15.2
}
```

### Leave Management
- `GET /api/leave-requests/` - List leave requests (filter by status, date)
- `POST /api/leave-requests/` - Create leave request
- `GET /api/leave-requests/{id}/` - Get leave request details
- `PUT /api/leave-requests/{id}/approve/` - Approve leave request
- `PUT /api/leave-requests/{id}/reject/` - Reject leave request
- `DELETE /api/leave-requests/{id}/` - Cancel leave request

### Overtime Management
- `GET /api/overtime/` - List overtime requests
- `POST /api/overtime/` - Create overtime request
- `PUT /api/overtime/{id}/approve/` - Approve overtime
- `PUT /api/overtime/{id}/reject/` - Reject overtime

### Attendance Reports
- `GET /api/attendance/reports/daily/` - Daily attendance report
- `GET /api/attendance/reports/monthly/` - Monthly summary
- `GET /api/attendance/export/` - Export attendance data (CSV, Excel)
## 💰 Payroll API
### Payslip Management
- `GET /api/payslips/` - List payslips (filter by period, employee)
- `GET /api/payslips/{id}/` - Get payslip details
- `GET /api/payslips/{id}/download/` - Download PDF payslip
- `POST /api/payslips/generate/` - Generate payslips for period
- `PUT /api/payslips/{id}/regenerate/` - Regenerate payslip

### Payroll Periods
- `GET /api/payroll-periods/` - List payroll periods
- `POST /api/payroll-periods/` - Create payroll period
- `GET /api/payroll-periods/{id}/` - Get period details
- `PUT /api/payroll-periods/{id}/close/` - Close period (finalize)
- `PUT /api/payroll-periods/{id}/reopen/` - Reopen period

### Salary Components
- `GET /api/salary-components/` - List salary components
- `POST /api/salary-components/` - Create salary component
- `PUT /api/salary-components/{id}/` - Update component
- `DELETE /api/salary-components/{id}/` - Delete component

### Example: Generate Payslips
```http
POST /api/payslips/generate/
Content-Type: application/json
X-Tenant: company1.localhost
Authorization: Bearer <access_token>

{
  "period_id": 1,
  "employee_ids": [1, 2, 3],
  "recalculate": true
}

Response:
{
  "message": "Payslips generated successfully",
  "generated_count": 3,
  "failed_count": 0,
  "details": [
    {
      "employee_id": 1,
      "payslip_id": 101,
      "status": "SUCCESS"
    }
  ]
}
```

## 📊 Performance API
### KPI Management
- `GET /api/kpis/` - List KPIs
- `POST /api/kpis/` - Create KPI
- `GET /api/kpis/{id}/` - Get KPI details
- `PUT /api/kpis/{id}/` - Update KPI
- `DELETE /api/kpis/{id}/` - Delete KPI

### KPI Targets
- `GET /api/kpi-targets/` - List KPI targets (filter by employee, period)
- `POST /api/kpi-targets/` - Assign KPI target to employee
- `PUT /api/kpi-targets/{id}/` - Update target value
- `PUT /api/kpi-targets/{id}/update-actual/` - Update actual achievement

### Appraisal Workflow
- `GET /api/appraisals/` - List appraisals (filter by status, employee)
- `POST /api/appraisals/` - Create appraisal
- `GET /api/appraisals/{id}/` - Get appraisal details
- `PUT /api/appraisals/{id}/submit/` - Submit for review
- `PUT /api/appraisals/{id}/approve/` - Approve appraisal
- `PUT /api/appraisals/{id}/reject/` - Reject appraisal
- `PUT /api/appraisals/{id}/complete/` - Complete appraisal

### Example: Create Appraisal
```http
POST /api/appraisals/
Content-Type: application/json
X-Tenant: company1.localhost
Authorization: Bearer <access_token>

{
  "employee_id": 1,
  "period_name": "Q1 2026",
  "start_date": "2026-01-01",
  "end_date": "2026-03-31",
  "reviewer_id": 2,
  "kpi_targets": [
    {
      "kpi_id": 1,
      "target_value": 1000000,
      "weight": 0.4
    }
  ]
}
```
## 🏢 Core HR API
### Department Management
- `GET /api/departments/` - List departments
- `POST /api/departments/` - Create department
- `GET /api/departments/{id}/` - Get department details
- `PUT /api/departments/{id}/` - Update department
- `DELETE /api/departments/{id}/` - Delete department

### Role Management
- `GET /api/roles/` - List roles
- `POST /api/roles/` - Create role
- `GET /api/roles/{id}/` - Get role details
- `PUT /api/roles/{id}/` - Update role
- `DELETE /api/roles/{id}/` - Delete role

### Branch Management
- `GET /api/branches/` - List branches
- `POST /api/branches/` - Create branch
- `GET /api/branches/{id}/` - Get branch details
- `PUT /api/branches/{id}/` - Update branch
- `DELETE /api/branches/{id}/` - Delete branch

## 🔄 Webhook Events
### Available Webhooks
```json
{
  "event": "attendance.clock_in",
  "tenant": "company1",
  "timestamp": "2026-03-31T08:00:00Z",
  "data": {
    "employee_id": 123,
    "employee_name": "John Doe",
    "check_in_time": "08:00:00",
    "location": {"lat": -6.2088, "lng": 106.8456},
    "branch_id": 1,
    "branch_name": "Head Office"
  }
}
```

### Event Types
- `attendance.clock_in` - Employee clocks in
- `attendance.clock_out` - Employee clocks out
- `attendance.late` - Employee clocks in late
- `leave.request_created` - New leave request created
- `leave.request_approved` - Leave request approved
- `leave.request_rejected` - Leave request rejected
- `payroll.payslip_generated` - Payslip generated for employee
- `payroll.period_closed` - Payroll period closed
- `performance.appraisal_created` - New appraisal created
- `performance.appraisal_completed` - Appraisal completed
- `employee.created` - New employee created
- `employee.updated` - Employee information updated

### Webhook Configuration
```http
POST /api/webhooks/
Content-Type: application/json
X-Tenant: company1.localhost
Authorization: Bearer <access_token>

{
  "url": "https://your-server.com/webhooks/hrms",
  "events": ["attendance.clock_in", "leave.request_created"],
  "secret": "your_webhook_secret",
  "is_active": true
}
```
## 🛠 SDKs & Client Libraries
### Python SDK
```python
from harikerja_sdk import HRMSClient

# Initialize client
client = HRMSClient(
    api_key="your_api_key",
    tenant="company1",
    base_url="https://api.harikerja.com"
)

# Get employees with pagination
employees = client.employees.list(
    page=1,
    page_size=50,
    department_id=1
)

# Create attendance
attendance = client.attendance.clock_in(
    latitude=-6.2088,
    longitude=106.8456,
    branch_id=1,
    photo_base64="data:image/jpeg;base64,..."
)

# Generate payslip
result = client.payroll.generate_payslips(
    period_id=1,
    employee_ids=[1, 2, 3]
)
```

### JavaScript/TypeScript SDK
```typescript
import { HRMSClient } from '@harikerja/sdk';

const client = new HRMSClient({
  apiKey: 'your_api_key',
  tenant: 'company1',
  baseUrl: 'https://api.harikerja.com'
});

// Get current user
const user = await client.users.me();

// Upload document
const document = await client.documents.upload({
  file: fileBuffer,
  document_type: 'KTP',
  employee_id: 1
});

// Get attendance report
const report = await client.attendance.getMonthlyReport({
  year: 2026,
  month: 3,
  department_id: 1
});
```

## ⚠️ Rate Limits & Quotas
### Default Limits
- **Per API Key**: 100 requests per minute
- **Per Tenant**: 1000 requests per hour
- **Per User**: 100 requests per minute
- **Burst Limit**: 150 requests allowed in short bursts

### Response Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1648753200
Retry-After: 60
```

### Quota Exceeded Response
```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Please try again in 60 seconds.",
    "retry_after": 60,
    "limit": 100,
    "remaining": 0,
    "reset": 1648753200
  }
}
```
## 🚨 Error Handling
### Common Error Codes
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (resource conflict)
- `422` - Unprocessable Entity (business logic error)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

### Error Response Format
```json
{
  "error": {
    "code": "validation_error",
    "message": "Invalid input data",
    "details": {
      "email": ["This field is required."],
      "password": ["Password must be at least 8 characters."]
    },
    "request_id": "req_123456789",
    "timestamp": "2026-03-31T08:00:00Z"
  }
}
```

### Validation Error Example
```json
{
  "error": {
    "code": "validation_error",
    "message": "The following fields are invalid",
    "details": {
      "join_date": ["Date cannot be in the future."],
      "salary": ["Salary must be greater than 0."]
    }
  }
}
```

## 🔐 Security Best Practices
### API Key Security
1. **Never expose API keys** in client-side code
2. **Rotate API keys** regularly (every 90 days)
3. **Use different keys** for different environments
4. **Monitor key usage** for suspicious activity

### Data Protection
1. **Encrypt sensitive data** before transmission
2. **Validate all input** to prevent injection attacks
3. **Use HTTPS** for all API communications
4. **Implement proper authentication** for all endpoints

## 📞 Support & Contact
### Technical Support
- **API Support**: api-support@harikerja.com
- **Documentation Issues**: docs@harikerja.com
- **Security Issues**: security@harikerja.com

### Emergency Support
- **Phone**: +62-21-XXXX-XXXX (24/7)
- **Slack**: #api-support channel
- **Status Page**: status.harikerja.com

### Resources
- **API Status**: https://status.harikerja.com
- **Changelog**: https://docs.harikerja.com/changelog
- **Community Forum**: https://community.harikerja.com
- **GitHub Repository**: https://github.com/harikerja/hrms-api

---

**Last Updated**: March 31, 2026  
**API Version**: v1.3.0  
**Base URL**: https://api.harikerja.com  
**Documentation**: https://docs.harikerja.com/api
