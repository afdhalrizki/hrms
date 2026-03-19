# Phase 52: Users Module Test Expansion

Expand test coverage for the `users` module, focusing on authentication flows, identity management, and advanced multi-tenant admin safeguards.

## Proposed Changes

### [Component Name] Users Module

#### [MODIFY] [tests.py](file:///d:/hr/hrms/backend/users/tests.py)
Add the following test cases to `UserModuleTestCase` and a new `AdminSafeguardExpansionTestCase`:
- `UserAuthenticationTestCase`:
    - `test_login_success`: Verify authenticating via `/api/users/login/`.
    - `test_login_failure`: Verify 401 for wrong credentials.
- `UserManagementTestCase`:
    - `test_email_normalization`: Verify `UserManager` normalizes email addresses.
    - `test_staff_list_access`: Verify staff can see all users while regular users only see themselves.
- `AdminSafeguardExpansionTestCase`:
    - `test_prevent_last_admin_deletion_multitenant`: Verify a user who is the last admin in one tenant (out of many) cannot be deleted.
    - `test_max_admins_reverse_m2m`: Verify `tenant.users.add()` enforces `max_admins` limit.

## Verification Plan

### Automated Tests
- Run users module tests with specialized environment settings:
  ```bash
  $env:DB_HOST='localhost'; venv\Scripts\python manage.py test users.tests -v 2
  ```
- Run full suite for regression:
  ```bash
  $env:DB_HOST='localhost'; venv\Scripts\python manage.py test -v 2
  ```
