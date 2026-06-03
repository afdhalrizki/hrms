# Midtrans Payment Gateway Environment & Credentials Guide

This document explains the current configuration of the **Midtrans Payment Gateway** integration on the **HariKerja HRMS** platform and provides instructions for transitioning the billing system to a live production environment.

---

## 1. Current Environment: Sandbox (Simulated)

For development, local testing, and automated test runners, the system is configured to use the **Midtrans Sandbox** environment. 

### 1.1 Bank Accounts & Fund Routing in Sandbox
*   **No Real Money involved**: All transactions created under the Sandbox environment do not use or route funds to any real bank accounts.
*   **Simulated Payments**: Payments are simulated using mock credit cards or virtual bank account simulators provided on the [Midtrans Sandbox Simulator page](https://docs.midtrans.com/en/technical-reference/sandbox-test-credentials).
*   **Default Fallback Keys**: If no keys are specified in the active `.env` file, the backend falls back to internal sandbox placeholder credentials:
    *   `MIDTRANS_SERVER_KEY` default: `SB-Mid-server-placeholder`
    *   `MIDTRANS_CLIENT_KEY` default: `SB-Mid-client-placeholder`

### 1.2 Sandbox Code Configuration
1.  **Frontend Script Source**: In [frontend/src/app/[locale]/settings/billing/page.tsx](file:///home/afdhal/data/hr/hrms/frontend/src/app/%5Blocale%5D/settings/billing/page.tsx#L194-L195), the billing page loads the Sandbox version of the Snap JS SDK:
    ```html
    src="https://app.sandbox.midtrans.com/snap/snap.js"
    ```
2.  **Backend Service Initializer**: In [backend/billing/services.py](file:///home/afdhal/data/hr/hrms/backend/billing/services.py#L9-L17), the Snap API client is initialized with the sandbox settings:
    ```python
    self.is_production = getattr(settings, 'MIDTRANS_IS_PRODUCTION', False)
    self.server_key = getattr(settings, 'MIDTRANS_SERVER_KEY', 'SB-Mid-server-placeholder')
    self.client_key = getattr(settings, 'MIDTRANS_CLIENT_KEY', 'SB-Mid-client-placeholder')
    ```

---

## 2. Production (Live) Environment Migration Guide

To transition the platform to accept real payments from tenants, follow these steps:

### 2.1 Midtrans Merchant Account Setup
1.  **Register a Business Account**: Sign up on the [Midtrans Portal](https://midtrans.com) and complete the business KYC requirements (submitting corporate legal documents, SIUP, NIB, tax ID, and directors' IDs).
2.  **Configure Settlement Bank Account**:
    *   Log in to the **Midtrans MAP (Merchant Administration Portal)**.
    *   Navigate to **Settings** > **Billing / Bank Account**.
    *   Register the **Corporate Bank Account of HariKerja (PT)**. All net payouts from tenant subscription payments will be transferred automatically (*settled*) by Midtrans to this bank account daily (H+1).

### 2.2 Updating Environment Variables
In your production environment files (e.g., `deploy/environments/.env.production` or container environment configs), update the following values:

```bash
# --- Midtrans Production Configuration ---
MIDTRANS_IS_PRODUCTION=True
MIDTRANS_SERVER_KEY=Mid-server-YOUR_LIVE_SERVER_KEY
MIDTRANS_CLIENT_KEY=Mid-client-YOUR_LIVE_CLIENT_KEY

# --- Frontend Build Variables ---
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=Mid-client-YOUR_LIVE_CLIENT_KEY
```

> [!IMPORTANT]
> The frontend billing page must load the production Snap SDK rather than sandbox. The codebase is configured to switch scripts based on the `MIDTRANS_IS_PRODUCTION` settings. Make sure the HTML script injection loads `https://app.midtrans.com/snap/snap.js` when in production mode.

### 2.3 Webhook Notification Configuration
Midtrans sends payment status callbacks (webhooks) asynchronously. You must register the webhook endpoint in the Midtrans Portal:

1.  Log in to the **Midtrans Merchant Portal** (Production mode).
2.  Go to **Settings** > **Access Keys** or **Configuration**.
3.  Set the **Payment Notification URL** to:
    `https://[your-production-domain].com/api/billing/webhook/`
4.  Set the **Failure Notification URL** (optional) to the same endpoint.

---

## 3. Webhook Signature Verification Flow

The backend validates webhooks to prevent spoofed/fake payment completions:
1.  A POST request is received at `/api/billing/webhook/`.
2.  The backend extracts the `order_id`, `status_code`, `gross_amount`, and `signature_key` from the payload.
3.  The expected signature is calculated as:
    $$\text{Signature} = \text{SHA512}(\text{order\_id} + \text{status\_code} + \text{gross\_amount} + \text{Production Server Key})$$
4.  If the calculated signature matches `signature_key`, the invoice is marked as `PAID`, and the tenant's expiry date is extended. Otherwise, the transaction is rejected as unauthorized.

---

## 🔗 Related Documents
*   [Developer Guide](./developer_guide.md)
*   [Direct Payroll Payout Integration Plan](../workflows_features/direct_payroll_payout.md)
