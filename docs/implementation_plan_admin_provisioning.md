# Employee & Admin Provisioning Implementation Plan

This plan details how we will implement the ability for current Tenant Admins to add new Employees and selectively grant them system access (including Admin privileges) from the dashboard.

## Goal Description
Enable the "Add Employee" button on the frontend `EmployeesPage` to actually create employee records in the database. Furthermore, add functionality to automatically provision a login `User` account for that employee, with a specific toggle to grant them `is_staff` (Admin) permissions within the tenant.

## Proposed Changes

### Backend API (`core` app)
We will extend the existing `EmployeeViewSet` to handle user account provisioning within the same transaction as employee creation.

#### [MODIFY] backend/core/views.py
- Override the `create` method in `EmployeeViewSet`.
- Extract custom flags: `create_user` and `is_admin` from the request payload.
- Wrap the execution in `transaction.atomic()` to ensure data integrity.
- First, save the `Employee` record using the standard serializer.
- If `create_user` is true, interact with `users.models.User` to:
  - `get_or_create` a user based on the employee's `email`.
  - Set a default password (e.g., `welcome123`).
  - Set `is_staff = True` if the `is_admin` flag was passed.
  - Link the user to the current tenant (`user.tenants.add(request.tenant)`).

### Frontend UI (`frontend` app)
We will connect the currently static `EmployeesPage` to the Live API and build the "Add Employee" Form Modal.

#### [MODIFY] frontend/src/app/employees/page.tsx
- Add a `useEffect` hook to fetch data from `/api/core/employees/` and replace the mock `const employees = [...]` data.
- Build an "Add Employee" Modal containing a form with required fields (NIK, Name, Email, Department, Role, Golongan).
- Add two toggle switches in the form:
  1. **"Create Login Account"**: Enables system access for the employee.
  2. **"Grant Admin Access"**: Mentions they will have full access to manage the tenant.
- Configure the form `onSubmit` handler to POST to the backend with the new flags.

## Verification Plan (Completed)
### Automated Tests
- API prefix connection bug identified during testing and fixed (`core/employees/` -> `employees/`).

### Manual Verification
- We deployed the browser subagent to click "Add Employee", fill out the form, toggle the "Grant Admin Access" switch, and submit it.
- **Result**: The form correctly validated constraints, the API populated the dropdown metadata flawlessly, and the submission invoked the Django atomic transaction to link the `User` and `Employee` to the current `Tenant`.

![Add Admin Employee Modal](./assets/add_employee_modal_before_submit_1773638661925.png)
