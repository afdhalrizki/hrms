# Walkthrough: Notification System Implementation

I have successfully refactored and integrated the notification system across the HRMS platform.

## 🏗️ Architecture Overview

The system is now split into a dedicated `notifications` app with a specialized `NotificationService`. This service handles the separation between administrative and operational alerts.

### Categories:
- **`ADMIN`**: System-wide alerts, billing updates, and quota warnings.
- **`OPERATIONAL`**: Employee-specific alerts, workflow status changes, and approval requests.

---

## 🚀 Implemented Triggers

### 1. Workflow & Approvals
Requests like **Leave**, **Overtime**, and **Reimbursements** now trigger:
- **Pending Alert**: Sent to the manager when a request reaches their sequence in the workflow.
- **Status Update**: Sent to the employee when their request is Approved, Rejected, or Returned (for revision).

### 2. Billing & Subscription
Integrated with the **Midtrans Webhook**:
- **Payment Success**: Admins receive a "Success" alert when a subscription or quota add-on is paid.
- **Payment Failure**: Admins are notified if a transaction is denied or expires.

### 3. Quota Management
Automated monitoring of system resources:
- **Employee Capacity**: Sends `WARNING` (90%) and `CRITICAL` (100%) notifications to Admins.
- **Storage Usage**: Sends `WARNING` (90%) and `CRITICAL` (100%) notifications to Admins based on exhaustive disk usage tracking (docs, attachments, photos).

### 4. Employee Management
Integrations for administrative events:
- **Termination/Deactivation**: Admins are notified when a user account is automatically disabled due to employee termination.

---

## 📂 Tenant Storage Isolation

All files are physically isolated into tenant-specific folders within the `media/` directory.

- **Structure**: `media/<schema_name>/<category>/<filename>`
- **Fields Covered**: KTP scans, NPWP scans, Face references, Reimbursement receipts, Attendance photos, and Leave attachments.
- **Implementation**: Uses `tenant_directory_path` utility in `core.utils` to ensure multi-tenancy at the file system level.

---

## 🛠️ Developer Guide

To send a new type of notification, use the `NotificationService`:

```python
from notifications.services import NotificationService
service = NotificationService()

# For system-level alerts
service.send_admin_notification(title="Title", message="Body", level='INFO')

# For user-specific alerts
service.send_employee_notification(target_user=user, title="Title", message="Body")
```

---
> [!TIP]
> **Separation of Concerns**: By using specialized methods like `notify_workflow_status_change`, we keep the business logic clean and ensure all notifications follow the same translated templates.

## ✅ Verification
- **Code Integrity**: Passed `python manage.py check`.
- **Database**: Migrations completed to add the `category` field and register the new app.
- **Integration**: Subscriptions (`process_subscriptions`), Billing (`webhook`), and Workflow (`core/services.py`) are all successfully hooked.
