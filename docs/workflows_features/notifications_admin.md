# Notification Mapping: Client & Admin (Subscription/Billing)
Version: 1.0
Status: Proposed

This document maps the notifications required for **Tenant Administrators** (Clients) regarding their subscription lifecycle, billing events, and resource quotas in the HRMS platform.

---

## 💎 1. Subscription Lifecycle
Notifications related to the status of the tenant's access to the platform.

| Event | Level | Trigger | Message |
| :--- | :--- | :--- | :--- |
| **Expiring Soon** | INFO | 7 days before `expiry_date` | "Your subscription expires in 7 days. Renew now to avoid service interruption." |
| **Final Warning** | WARNING | 3 days before `expiry_date` | "Your subscription expires in 3 days. Access will become Read-Only after the due date." |
| **Subscription Expired** | WARNING | `expiry_date` passed (Grace Period) | "Subscription expired. System is now in **Read-Only** mode. Please renew to restore full access." |
| **Account Suspended** | CRITICAL | Grace period (14 days) passed | "Account suspended due to non-payment. Access is blocked. Contact support for data recovery." |
| **Renewal Successful** | SUCCESS | Payment settlement | "Thank you! Your subscription for [Plan] has been successfully renewed until [Date]." |

---

## 💳 2. Billing & Payments
Interactions with the payment gateway (Midtrans) and financial records.

| Event | Level | Trigger | Message |
| :--- | :--- | :--- | :--- |
| **Invoice Generated** | INFO | Checkout initiated | "New invoice #[ID] generated for [Plan/Add-on]. Please complete your payment." |
| **Payment Success** | SUCCESS | Midtrans Webhook (Settlement) | "Payment for Invoice #[ID] received. Your quota/plan has been updated automatically." |
| **Payment Failed** | ERROR | Midtrans Webhook (Deny/Expire) | "Payment for Invoice #[ID] failed or expired. Please try again or use a different method." |

---

## 📈 3. Resource Quotas (Elastic Quota)
Alerts focused on the "Hard Cap" limits of the tiered pricing model.

| Event | Level | Trigger | Message |
| :--- | :--- | :--- | :--- |
| **Employee Limit Near** | INFO | 90% of `total_employee_capacity` | "Your employee capacity is almost full (90%). Consider purchasing an **Add-on block**." |
| **Employee Limit Full** | WARNING | 100% of `total_employee_capacity` | "Employee limit reached. You cannot add more employees until you increase your quota." |
| **Tier Hard Cap Reached** | WARNING | Attempting add-on at tier limit | "You've reached the maximum add-on limit for the [Essential] tier. To add more staff, please upgrade to [Professional]." |
| **Storage Warning** | WARNING | 80% of `storage_limit_mb` | "Your file storage is reaching its limit. Please delete old documents or upgrade your plan." |

---

## 🛠️ Implementation Notes
- **Channel Delivery**: In-app Notification (Sidebar bell) + Email for Critical/Billing events.
- **Backend Model**: `SystemNotification` from `core.models`.
- **Worker**: Weekly/Daily cron job (Celery) for expiry and storage checks.
