# Notification System Architecture & Event Mapping (In-App & Email)

This document provides a comprehensive overview of the integrated notification system architecture, configurations, and event mapping schemas (both in-app bell notifications and automated emails) implemented on the **HariKerja HRMS** platform.

---

## 🏗️ 1. Notification Architecture

The notification module is housed under the `backend/notifications/` package, managed via a unified wrapper class: `NotificationService`. This wrapper abstracts the routing and delivery of notifications across multiple channels asynchronously, leveraging **Celery** tasks and **Redis** message brokers.

```mermaid
flowchart TD
    Trigger[Event Trigger\n- Model Signals / views.py] --> ServiceCall[Invoke NotificationService]
    
    ServiceCall --> CheckCategory{Notification Category?}
    
    CheckCategory -- ADMIN --> RouteAdmin[Admin Alert:\n- Quota Warnings\n- Billing Payments\n- Tenant Registration]
    CheckCategory -- OPERATIONAL --> RouteOper[Operational Alert:\n- Leave/Reimburse Workflow\n- Payslip Issued\n- Attendance Alerts]
    
    RouteAdmin --> WriteDB[Save to public.SystemNotification]
    RouteOper --> WriteDBTenant[Save to [tenant].SystemNotification]
    
    WriteDB --> CheckEmail{Is Email Enabled?}
    WriteDBTenant --> CheckEmail
    
    CheckEmail -- Yes --> QueueCelery[Trigger Task: send_notification_email_task]
    CheckEmail -- No --> InAppOnly[Render Only via In-App Bell UI]
    
    QueueCelery --> RedisQueue[Redis Broker Queue]
    RedisQueue --> CeleryWorker[Celery Worker Asynchronous]
    CeleryWorker --> SMTPServer[Send via SMTP Server]
    SMTPServer --> ClientInbox[Recipient Inbox]

    classDef success fill:#10B981,stroke:#059669,color:#fff;
    classDef step fill:#3B82F6,stroke:#2563EB,color:#fff;
    classDef decision fill:#F59E0B,stroke:#D97706,color:#fff;
    
    class ClientInbox success;
    class Trigger,ServiceCall,RouteAdmin,RouteOper,WriteDB,WriteDBTenant,QueueCelery,InAppOnly,RedisQueue,CeleryWorker,SMTPServer step;
    class CheckCategory,CheckEmail decision;
```

### Main Categories:
1.  **`ADMIN`**: Targeted at Tenant Administrators or SaaS Platform Operators. Contains subscription billing status, payment notifications, and critical resource capacity warnings.
2.  **`OPERATIONAL`**: Targeted at general employees or managers. Encompasses clock-in reminders, workflow approval requests, company announcements, and digital payslip notices.

---

## ⚙️ 2. Email Server Configuration

All outbound email alerts are processed asynchronously to avoid slowing down primary HTTP request-response cycles. Outbound emails are governed by parameters in the backend settings (`settings.py`):

*   **`ENABLE_EMAIL_NOTIFICATIONS`**: A global boolean flag (`True` / `False`) to enable or disable outbound SMTP traffic.
*   **Sender Identity**:
    *   *Sender Name*: `HariKerja HRMS`
    *   *Sender Email*: `noreply@harikerja.com` (or client-level SMTP relay domains).
*   **Recipient Preferences**: Employees can toggle operational email delivery categories from their user profile settings. In-app alerts remain active regardless of email toggles.

---

## 📊 3. Notification Event Matrix

### 3.1 Registrations & Tenant Lifecycles
Managed in `backend/tenants/tasks.py`.

| Event Type | Trigger | Recipient | Channels | Default Email Subject & Body |
| :--- | :--- | :--- | :--- | :--- |
| **Registration Received** | Prospective client submits signup form. | Tenant Admin | Email | **Subject**: `Registration Request Received`<br>**Body**: Confirms receipt and informs the user their portal request is under review. |
| **Registration Approved** | Superadmin approves the signup. | Tenant Admin | Email | **Subject**: `Welcome to HariKerja HRMS`<br>**Body**: Contains the corporate subdomain workspace URL and temporary credentials. |
| **Employee Invitation** | HR registers a new employee. | New Employee | Email | **Subject**: `Welcome to HariKerja`<br>**Body**: Contains activation links and initial login password instructions. |

### 3.2 Workflow & Operations
Managed via `NotificationService` in `backend/notifications/services.py`.

| Event Type | Trigger | Recipient | Channels | Default Email Subject & Body |
| :--- | :--- | :--- | :--- | :--- |
| **Approval Pending** | Leave or reimbursement request reaches an approver stage. | Assigned Approver (Manager/HR) | In-App & Email | **Subject**: `Approval Required`<br>**Body**: `[Employee Name] submitted a [Request Type]. Action required.` |
| **Request Approved** | Final approver signs off on the request. | Applicant (Employee) | In-App & Email | **Subject**: `Request Approved`<br>**Body**: `Your [Request Type] request for [Date] has been approved.` |
| **Request Rejected** | Approver rejects the request. | Applicant (Employee) | In-App & Email | **Subject**: `Request Rejected`<br>**Body**: `Your [Request Type] request has been rejected. Reason: [Comment].` |

### 3.3 Billing & Resource Quotas
Managed via `NotificationService` and Midtrans webhook listeners.

| Event Type | Trigger | Recipient | Channels | Default Email Subject & Body |
| :--- | :--- | :--- | :--- | :--- |
| **Invoice Created** | A new subscription cycle invoice is generated. | Tenant Admin | Email & In-App | **Subject**: `New Invoicing Statement #${invoice_id}`<br>**Body**: Outlines payment items and provides a Midtrans Snap payment URL. |
| **Payment Success** | Webhook confirms transaction settlement. | Tenant Admin | Email & In-App | **Subject**: `Payment Confirmed #${invoice_id}`<br>**Body**: Confirms receipt of funds and marks the subscription extended. |
| **Payment Failed** | Webhook transaction status returns cancelled/expired. | Tenant Admin | Email & In-App | **Subject**: `Payment Failed #${invoice_id}`<br>**Body**: Alerts the admin of payment failures and prompts checkout retry. |
| **Employee Seats Warning** | Active employees reach **90%** of plan limit. | Tenant Admin | In-App | **Body**: `Employee capacity is approaching limit (90%). Consider upgrading.` |
| **Employee Seats Exceeded** | Active employees reach **100%** of plan limit. | Tenant Admin | In-App & Email | **Subject**: `Critical: Employee Limit Reached`<br>**Body**: Block additions of new active users until quota limits are expanded. |
| **Storage Capacity Warning** | File usage reaches **90%** of plan limit. | Tenant Admin | In-App | **Body**: `Storage capacity is approaching limit (90%). Please clean up assets.` |
| **Storage Capacity Full** | File usage reaches **100%** of plan limit. | Tenant Admin | In-App & Email | **Subject**: `Critical: Storage Limit Reached`<br>**Body**: File uploads blocked. Attendance clock-in fallback active (bypassing photos). |

---

## 🛠️ 4. Developer Guide

To fire notifications from the Django backend, utilize the unified methods inside `NotificationService`. Avoid invoking direct SMTP functions.

### 4.1 System Notifications (Admin Alerts)
Used for quota warnings or billing events.
```python
from notifications.services import NotificationService

notification_service = NotificationService()
notification_service.send_admin_notification(
    tenant=request.tenant,
    title="Storage Limit Warning",
    message="Your storage capacity has reached 90%. Please review assets.",
    level="WARNING"  # Options: INFO, WARNING, CRITICAL, SUCCESS
)
```

### 4.2 Operational Employee Notifications
Used to notify employees on approval states.
```python
from notifications.services import NotificationService

notification_service = NotificationService()
notification_service.send_employee_notification(
    target_user=employee.user,
    title="Leave Request Approved",
    message="Your annual leave request for 2026-06-01 has been approved.",
    send_email=True  # Dispatches SMTP email if verified in user preferences
)
```

### 4.3 Signal-Based Automation
Hook notification dispatchers into post-save signals on database models:
```python
from django.db.models.signals import post_save
from django.dispatch import receiver
from core.models import WorkflowAction
from notifications.services import NotificationService

@receiver(post_save, sender=WorkflowAction)
def notify_workflow_update(sender, instance, created, **kwargs):
    if created:
        service = NotificationService()
        # Automatically detects the next approver sequence or final states
        service.notify_workflow_status_change(instance)
```
