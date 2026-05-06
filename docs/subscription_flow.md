# Subscription Flow & Tenant Trial Lifecycle

This document explains the technical workflow for new tenant registration, automatic trial provisioning, and subscription-based access gating.

## 1. Registration Workflow (Signup)
1. **Public Signup**: Prospective tenants fill out the registration form at the public domain (`/signup`).
   - Data collected: Company Name, Desired Subdomain, and Admin Email.
2. **Pending State**: The request is stored as a `RegistrationRequest` with a `PENDING` status.
3. **Approval**: A Super Admin reviews and approves the registration via the internal management portal.

## 2. Automatic Activation & Trial Period
When a registration is approved, the system automatically performs the following:
- **Tenant Creation**: A new tenant is created with `plan_type='FREE'`.
- **Automatic Expiry Setting**: The `expiry_date` is automatically set to **14 days** from the approval date.
- **Infrastructure Provisioning**: The PostgreSQL schema is created, HR master data is initialized, and the Tenant Admin account is provisioned.

## 3. Subscription Access Gating
The system monitors the `expiry_date` via middleware and enforces tiered restrictions based on the subscription status:

### A. Active Phase (Day 1 to Day 14)
- **Status**: `ACTIVE`
- **Access**: Full Access (Read & Write).
- **Behavior**: Users can perform all operations within their plan's features.

### B. Grace Period (Day 15 to Day 28)
- **Status**: `EXPIRED`
- **Access**: **Read-Only Mode**.
  - Users can view data (GET requests).
  - Users are **blocked** from creating, updating, or deleting data (POST, PUT, PATCH, DELETE).
- **Error Response**: `402 Payment Required` with code `SUBSCRIPTION_EXPIRED_READ_ONLY`.
- **Goal**: Allows the tenant to continue monitoring data while processing their renewal payment.

### C. Suspension Phase (Day 29 onwards)
- **Status**: `SUSPENDED`
- **Access**: **Total Block**.
  - All functional APIs are blocked (`402 Payment Required`).
  - Only the **Billing** and **Logout** endpoints remain accessible.
- **Error Response**: `402 Payment Required` with code `SUBSCRIPTION_SUSPENDED`.

## 4. Renewal & Upgrades
Once a payment is successfully processed via Midtrans:
1. The `plan_type` is updated (e.g., to Essential, Professional, or Premium).
2. The `expiry_date` is extended based on the purchase (e.g., +30 days or +365 days).
3. The status returns to `ACTIVE`, restoring full write access immediately.
