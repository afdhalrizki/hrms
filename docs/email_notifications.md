# Email Notification Mapping

This document outlines the automatic email notifications sent by the **HariKerja HRMS** system, including their triggers, recipients, and purpose.

## Configuration
All email notifications are sent asynchronously via **Celery**. They are only triggered if:
1. `ENABLE_EMAIL_NOTIFICATIONS` is set to `True` in the system settings.
2. The recipient has a valid email address.
3. The recipient has enabled "Email Notifications" in their user profile (for operational emails).

**Sender Identity:**
- **From Name:** `HariKerja HRMS`
- **From Email:** `noreply@harikerja.com` (or configured domain)
- **Signature:** `Terima kasih, HariKerja HRMS`

---

## 1. Tenant & Registration Emails
Managed in `backend/tenants/tasks.py`.

| Trigger | Recipient | Subject | Description |
| :--- | :--- | :--- | :--- |
| **New Registration** | Tenant Admin | `Registration Received` | Confirms that the registration request has been received and is under review. |
| **Registration Approved** | Tenant Admin | `Welcome to HRMS` | Sent when the superadmin approves the tenant. Contains workspace URL and initial credentials. |
| **New Employee Onboarding** | New Employee | `Selamat Datang di HariKerja HRMS` | Sent when HR creates a new employee account. Contains login instructions and workspace link. |


## 2. Workflow & Operational Emails
Managed via `NotificationService` in `backend/notifications/services.py`.

| Trigger | Recipient | Subject | Description |
| :--- | :--- | :--- | :--- |
| **New Request Submitted** | Approver (Manager/HR) | `Persetujuan Diperlukan` | Notifies the next person in the workflow that a request (Leave, Reimbursement, etc.) needs their attention. |
| **Request Approved/Rejected** | Requester (Employee) | `Status Pengajuan: [Status]` | Notifies the employee of the final decision on their request. |
| **Payslip Published** | Employee | `Slip Gaji Terbit` | Notifies the employee that their payslip for the period is available in the system. |

## 3. Billing & System Emails
Managed via `NotificationService` in `backend/notifications/services.py`.

| Trigger | Recipient | Subject | Description |
| :--- | :--- | :--- | :--- |
| **Payment Success/Fail** | Tenant Admin | `Pembayaran Berhasil/Gagal` | Notifies the admin of the status of their subscription payment via Midtrans. |
| **Employee Quota Limit** | Tenant Admin | `Peringatan Kuota Karyawan` | Sent when the number of employees reaches a certain percentage of the subscription limit. |
| **Storage Limit** | Tenant Admin | `Peringatan Penyimpanan` | Sent when storage usage reaches a high percentage of the allocated limit. |

---

## Technical Implementation
- **Base Service**: `NotificationService` handles the logic for creating in-app records and triggering email tasks.
- **Task Queue**: `send_notification_email_task` in `backend/notifications/tasks.py` handles the actual SMTP delivery.
- **Branding**: The signature and sender name are standardized across all tasks to maintain the **HariKerja HRMS** brand identity.
