# Performance Module Unit Testing Implementation Plan

## Goal Description
Establish 100% test coverage for the Performance (KPI & Appraisal) module to ensure data accuracy and role-based privacy for employee evaluations.

## Proposed Changes

### [NEW] backend/performance/tests.py
- **Model Tests**: Test string representations and field defaults (e.g., `actual_value` defaulting to 0).
- **KPI API**: CRUD operations for administrators only. Verify unit choices (Percentage, Currency, Unit).
- **Target API**: Verify that employees can only see targets assigned to them, while managers/admins see all.
- **Appraisal Lifecycle**: Test the full DRAFT -> SUBMITTED -> REVIEWED -> COMPLETED flow, including status transitions and record locking.
- **Review API**: Verify that employees can only see completed reviews or reviews assigned to them as reviewer.

### [FIX] Migrations
- Create `performance/migrations/0001_initial.py` to ensure the app is recognized by the test runner and schemas are correctly populated.

## Verification Plan

### Automated Tests
- Run `manage.py test performance` to verify all 33 scenarios.
- Run `manage.py test` to verify zero regressions in related modules (Attendance, Payroll).

### Logic Integrity
- Ensure that the Appraisal total rating is calculated correctly based on reviewers' input.
- Confirm that the `FeatureRequiredPermission` correctly blocks access if the 'performance' module is disabled for a tenant.
