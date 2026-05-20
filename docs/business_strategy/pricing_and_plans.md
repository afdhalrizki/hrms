# Subscription Tiers & Pricing Strategy

This document outlines the business strategy, subscription tiers, resource quota limits, and elastic add-on pricing structures implemented on the **HariKerja HRMS** platform.

---

## 💎 1. Subscription Tiers

The HariKerja platform is priced using a flat rate per tier model, rather than per-user pricing. This ensures that clients have predictable HR software costs as their organizations scale.

| Plan Level | Monthly Fee (IDR) | Employee Capacity | Storage Limit | Key Modules Unlocked |
| :--- | :--- | :--- | :--- | :--- |
| **FREE** | Rp0 | Max 10 | 50 MB | Employee Profiles, Basic Attendance Dashboard |
| **ESSENTIAL** | Rp125,000 | Max 25 | 250 MB | GPS Attendance + Geofencing, Leave Management, N-Level Approval Workflows |
| **PROFESSIONAL** | Rp750,000 | Max 100 | 1 GB | Essential Modules, Indonesian Payroll (TER 2024 PPh 21 & BPJS), Reimbursements |
| **PREMIUM** | Rp1,500,000 | Max 500 | 5 GB | Professional Modules, KPI & Performance Management, Custom RBAC, Multi-Branch Management |
| **ENTERPRISE** | From Rp5,000,000 | 2000+ (Custom) | 20 GB+ (Custom) | Full Module Suite, Audit Log Exports, Dedicated Cloud Server, 24/7 Support SLA |


---

## 📈 2. Elastic Add-ons

If a tenant requires additional capacity but is not yet ready to upgrade to the next tier, they can purchase monthly **Add-on Blocks** that are appended directly to their subscription invoices:

### 2.1 Employee Seat Blocks
Sold in increments of **+5 Employees**:
*   *Essential Tier*: Rp25,000 /month per block.
*   *Professional Tier*: Rp50,000 /month per block.
*   *Premium Tier*: Rp75,000 /month per block.

### 2.2 Storage Blocks
Sold in increments of **+1 GB**:
*   Rp50,000 /month per block (flat rate across all tiers).

---

## 🔒 3. Upgrade & Downgrade Policies

To prevent database abuse and billing errors, transition validation rules are enforced at the backend level:

### 3.1 Plan Upgrades
*   **Pro-rata Calculations**: The system calculates the remaining days in the active billing cycle and applies a pro-rated discount towards the new tier cost.
*   **Instant Activation**: Once Midtrans Snap confirms transaction `settlement`, employee and storage capacities are upgraded in the database in real-time.

### 3.2 Plan Downgrades
The system blocks downgrade requests if active tenant resources exceed the limits of the target tier:
*   *Employee Count Audit*: If the tenant has 32 active employees, downgrading to the *Essential* tier (max 25 employees) is blocked. The HR administrator must deactivate at least 7 employees first.
*   *Storage Audit*: If the tenant's media usage is 400 MB, downgrading to the *Essential* tier (max 250 MB) is blocked until the admin deletes older files to bring usage below the limit.

---

## ⚙️ 4. Financial Policies
*   **Annual Discount**: Upfront annual billing for 12 months receives a **20% discount** off the cumulative monthly rate.
*   **Free Trial**: New signups automatically receive a **14-day free trial** of the *Essential* plan, with no credit card required.
