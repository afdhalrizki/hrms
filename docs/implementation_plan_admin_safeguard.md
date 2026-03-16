# Safeguard Minimum Admin Count Implementation Plan

## Goal Description
Ensure that a tenant must have at least one active administrator at all times. The system must prevent the deletion or demotion (removing `is_staff` privileges) of a user if they are the only remaining administrator for any tenant they belong to.

## Proposed Changes

### [MODIFY] backend/users/models.py
We will use Django's built-in `pre_save` and `pre_delete` signals attached to the `User` model to intercept modifications and deletions globally (covering both API views and the Django Admin panel).

- **Add Imports**: Import `pre_save`, `pre_delete` from `django.db.models.signals`, and `receiver` from `django.dispatch`. Import `ValidationError` from `django.core.exceptions`.
- **Implement `prevent_last_admin_demotion` (pre_save)**:
  - Check if the model has a primary key (`instance.pk` exists, meaning it's an update, not a creation).
  - Retrieve the original user from the database.
  - If the original user was `is_staff=True` and the incoming update is `is_staff=False`:
    - Iterate through all tenants associated with the user.
    - Count the number of active admins (`is_staff=True`) in that tenant.
    - If the count is `<= 1`, raise a `ValidationError` protecting the tenant.
- **Implement `prevent_last_admin_deletion` (pre_delete)**:
  - If the user being deleted is `is_staff=True`:
    - Iterate through their associated tenants.
    - Count the admins for each tenant.
    - If the count is `<= 1`, raise a `ValidationError` preventing deletion.

## Verification Plan
### Automated Tests
- Can create unit tests or verify directly via Django Shell / Admin.
### Manual Verification
- We will use the `run_command` tool to execute a Python script in the Django context.
- We will attempt to demote the only admin of `company1` and verify that a `ValidationError` is raised and the transaction is aborted.
- We will attempt to delete the only admin and verify it is also blocked.
