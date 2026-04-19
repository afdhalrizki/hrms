# SaaS Billing & Payment Integration (Midtrans)

This document details the architectural implementation of the automated subscription billing system for the harikerja HRMS platform.

## 💳 Architecture Overview

The system utilizes **Midtrans Snap** for the frontend payment experience and a backend **Webhook Listener** for state synchronization.

### 1. Data Flow (Renewal Flow)
1.  **Selection**: Tenant admin selects a plan or renewal duration in the **Billing Page**.
2.  **Checkout**: Frontend calls `/api/billing/checkout/`.
3.  **Token Generation**:
    *   Backend creates a `SubscriptionInvoice` record with `status=PENDING`.
    *   Backend calls Midtrans Snap API with `order_id` and amount.
    *   Midtrans returns a `snap_token`.
4.  **Payment**: Frontend opens the Snap Popup using the token.
5.  **Completion**: User pays via Bank Transfer, E-Wallet, or Credit Card.
6.  **Webhook**: Midtrans sends a POST request to `/api/billing/webhook/`.
7.  **Finalization**:
    *   Backend validates the signature.
    *   Backend updates `SubscriptionInvoice` to `PAID`.
    *   Backend updates the `Tenant` model's `expiry_date` (current date + 30/365 days).
    *   System creates a `SystemNotification` for the tenant.

## 🔒 Webhook Security

To prevent unauthorized status updates, the webhook handler verifies the Midtrans status using the following fields:
- `order_id`: Must exist in `SubscriptionInvoice`.
- `status_code`: Must be `200`.
- `signature_key`: SHA512 hash verify: `order_id + status_code + gross_amount + ServerKey`.

## 🗄️ Database Models

### SubscriptionInvoice (Shared Schema)
Managed in the `public` schema since payments are handled at the platform level.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `tenant` | FK | Link to the Tenant |
| `amount` | Decimal | Amount in IDR |
| `status` | Char | PENDING, PAID, FAILED, EXPIRED |
| `payment_type` | Char | bank_transfer, gopay, etc. |
| `expiry_date_extension` | Integer | Days to add upon success |

---

## 🚀 Sandbox vs Production

| Environment | Midtrans URL | Server Key |
| :--- | :--- | :--- |
| **Development** | `https://app.sandbox.midtrans.com` | `SB-Mid-server-...` |
| **Production** | `https://app.midtrans.com` | `Mid-server-...` |

> [!CAUTION]
> Never commit `MIDTRANS_SERVER_KEY` to version control. Always use environment variables.
