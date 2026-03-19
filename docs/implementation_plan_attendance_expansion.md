# Attendance Unit Test Expansion & Logic Hardening

## Goal Description
Expand the `attendance` module test suite to cover critical edge cases and enforce the security hardening implemented in Phase 48. Additionally, implement a missing check to prevent attendance records on approved leave days.

## Proposed Changes

### [MODIFY] backend/attendance/services.py
- **Leave Conflict Check**: Update `process_clock_in` to check if an `APPROVED` leave request exists for the employee on the given date. If so, raise a `ValidationError`.

### [MODIFY] backend/attendance/tests.py
Add the following test methods to `AttendanceIntegrationTestCase`:

#### 1. Advanced Geofencing
- `test_assigned_branch_geofence`: Verify clock-in is relative to the employee's assigned branch even if multiple branches exist in the tenant.

#### 2. Shift Logic
- `test_flexible_shift_no_late_status`: Clocking in after `start_time` on a `is_flexible=True` shift should remain `PRESENT`.

#### 3. RBAC & Security Enforcement
- `test_employee_cannot_create_others_attendance`: Verify 400/403 when trying to clock in for another ID.
- `test_employee_cannot_update_status_or_date`: Verify `PATCH` on `status` or `date` fields is ignored or rejected for regular employees.
- `test_employee_cannot_delete_attendance`: Verify `DELETE` is blocked.

#### 4. Leave & Overtime Logic
- `test_attendance_blocked_on_approved_leave`: Verify `ValidationError` when clocking in during an approved leave.
- `test_leave_balance_insufficient`: Verify `ValidationError` when requesting more days than available in `LeaveBalance`.
- `test_overtime_supervisor_approval_flow`: Verify the status transition using `WorkflowService` mocks or actual logic.

## Verification Plan

### Automated Tests
- Run newly added tests specifically:
  `venv\Scripts\python manage.py test attendance.tests.AttendanceIntegrationTestCase -v 2`
- Run the full suite to ensure no regressions:
  `venv\Scripts\python manage.py test attendance`

### Manual Verification
- Attempt to clock in via API with an approved leave on the same day and observe the error message.
- Try to update an attendance record's status from 'OFF_SITE' to 'PRESENT' as a regular user using `curl` or Postman.
