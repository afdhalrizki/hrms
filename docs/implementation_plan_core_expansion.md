# Implementation Plan - Core Module Test Expansion

Expand the `core` module's unit tests to ensure comprehensive coverage for master data, RBAC, workflows, and system infrastructure.

## Proposed Changes

### [Backend] [core]

#### [MODIFY] [tests.py](file:///d:/hr/hrms/backend/core/tests.py)
- Add `BranchTestCase`:
  - Verify `Branch` CRUD with latitude, longitude, and radius.
  - Verify default `radius_meters`.
- Add `RBACManagementTestCase`:
  - Verify `AccessRole` CRUD.
  - Test protection of `is_default=True` roles (prevent deletion).
  - Verify assignment of `AccessRole` to `Employee`.
- Add `SystemNotificationTestCase`:
  - Verify notification creation and `is_active` filtering.
  - Test global vs user-specific notification delivery.
- Add `APIKeyTestCase`:
  - Verify `APIKey` CRUD and `is_active` flag.
- Add `AuditIntegrationTestCase`:
  - Verify that `AuditModelMixin` correctly generates `AuditLog` entries on `Golongan` creation/update.
- Add `DataConstraintTestCase`:
  - Verify `Employee` PTKP status validation.
  - Verify unique `nik` and `ktp_number` enforcements.

## Verification Plan

### Automated Tests
- Run the expanded core tests:
  ```powershell
  venv\Scripts\python manage.py test core.tests -v 2
  ```
- Run full suite to ensure no regressions:
  ```powershell
  venv\Scripts\python manage.py test -v 2
  ```
