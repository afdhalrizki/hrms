# RBAC Security Hardening & Permission Whitelisting Implementation Plan

## Goal Description
Tighten the security of the standard RBAC permission class (`HasRBACPermission`) to prevent unauthorized administrative operations while maintaining self-service functionality for employees.

## Proposed Changes

### [MODIFY] backend/core/permissions.py
- **Restrictive Default**: Update `has_permission` to allow ONLY `GET` requests for users who do not have manager/admin roles.
- **Whitelisting Mechanism**: Add a check for `allow_self_service = True` on the ViewSet. If this flag is present, the logic allows `POST` and `PATCH` operations for regular employees (e.g., for creating their own attendance or leave requests).

### Whitelist Application
Update following ViewSets to include `allow_self_service = True`:
- `AttendanceViewSet` (attendance/views.py)
- `LeaveRequestViewSet` (attendance/views.py)
- `OvertimeViewSet` (attendance/views.py)
- `ReimbursementViewSet` (reimbursement/views.py)
- `AppraisalReviewViewSet` (performance/views.py)

## Verification Plan

### Automated Tests
- **Security Check**: Verify that a regular employee receives a `403 Forbidden` when POSTing to `/api/kpis/` or `/api/departments/`.
- **Self-Service Check**: Verify that a regular employee can still successfully POST to `/api/attendance/` and `/api/leave-requests/`.
- **Regression**: Run the full backend test suite (99 tests) to ensure no existing workflows are broken.

### Manual Verification
- Attempt to create a KPI as a non-staff user via the API and confirm rejection.
- Confirm that the Attendance "Check-In" button on the mobile app still works for regular employees.
