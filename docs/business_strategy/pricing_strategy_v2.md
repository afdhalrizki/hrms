# HRMS SaaS Pricing Strategy (v2.0)

This document outlines the proposed modern pricing model for the **harikerja HRMS** platform. The strategy focuses on **Freemium Acquisition** to capture the micro-SME market while providing a scalable **Elastic Quota** system for growing enterprises.

---

## 💎 1. Subscription Tiers (Feature-Based)

Our pricing remains focused on **Value-Based Tiers**. Customers upgrade to unlock high-impact modules like Payroll and Performance Management.

| Plan | Target Audience | Base Capacity | Price (Monthly) | Key Modules Included |
| :--- | :--- | :--- | :--- | :--- |
| **FREE** | Micro-SMEs / Startups | **10 Employees** | **Rp 0** | Core HR, Basic Attendance |
| **ESSENTIAL** | Small Businesses | **50 Employees** | **Rp 250,000** | Attendance + Geofencing, Leaves |
| **PROFESSIONAL** | Mid-size Organizations | **100 Employees** | **Rp 750,000** | **Indonesian Payroll (PPh 21/BPJS)**, Reimbursements |
| **PREMIUM** | High-growth Enterprises | **500 Employees** | **Rp 1,500,000** | Performance Management, KPI, Advanced RBAC |
| **ENTERPRISE** | Core Organizations | **2,000+** | **Contact Us** | Full Suite + Analytics, Audit, Dedicated SLA |

---

## 🧩 2. Elastic Quota (Add-on Blocks)

Instead of forcing a company to leap to a much higher (and expensive) tier just for a few extra employees, we offer **Capacity Add-ons**. This ensures a smooth cost progression for the client.

### 2.1 Unit Pricing (Per Block of 10 Employees)
The base unit for purchasing extra quota is a block of **10 Employees**. 

| Parent Plan | Price per Block (+10) | Price per Employee (pax) |
| :--- | :--- | :--- |
| **ESSENTIAL** | **Rp 50,000** | Rp 5,000 |
| **PROFESSIONAL** | **Rp 100,000** | Rp 10,000 |
| **PREMIUM** | **Rp 150,000** | Rp 15,000 |

### 2.2 Available Purchase Options (UI)
While the base unit is 10, customers can select these packages in the Billing Dashboard for faster checkout:
*   **Small**: +10 Employees
*   **Medium**: +20 Employees
*   **Large**: +50 Employees (Recommended for Premium)
*   **Enterprise**: +100 Employees

### 2.3 Limits & Rules (System Enforced)
*   **Maximum Capacity**: 
    *   **Essential**: Max **100** total employees (Base 50 + 5 Add-ons).
    *   **Professional**: Max **1,000** total employees (Base 100 + 90 Add-ons).
    *   **Premium**: Unlimited (No hard cap on add-ons).
    
> [!IMPORTANT]
> **Hard Cap Enforcement**: The system will block any further add-on purchases if the total capacity reaches the tier's limit. Tenants must upgrade to the next tier to increase their headcount beyond these limits.

### 2.4 Storage Add-on (Elastic Quota)
Tenants who require more space for employee documents or payroll records can expand their storage without upgrading their base plan.

| Add-on Type | Block Size | Price (Monthly) |
| :--- | :--- | :--- |
| **Extra Storage** | **1 GB** | **Rp 50,000** |

*   **Logic**: Incremental storage is added to the base tier storage limit.
*   **Billing**: Pro-rated if purchased mid-cycle (following Midtrans standard).
*   **Accessibility**: Immediately available upon payment settlement.

> [!NOTE]
> **Why the price difference?**
> Add-on costs reflect the operational complexity of the features. A **Professional** employee costs more to support because the system performs automated tax (PPh 21) and social security (BPJS) calculations for them.

---

## 📈 3. Discounting & Commitment

*   **Annual Billing**: **20% Discount** (Get 12 months for the price of 10).
*   **Non-Profit Discount**: **15% Discount** for registered NGOs and Foundations.
*   **Startup Referral**: Refer another company and get **1 month free** on your next renewal.

---

## 🚦 4. Subscription States & Enforcement

The system automatically monitors and enforces these states:

1.  **ACTIVE**: Full module access as per the purchased tier.
2.  **EXPIRED (Grace Period)**:
    *   Lasts for **14 days** after the due date.
    *   Access becomes **Read-Only** (Dashboard, Reports, and View-only Employee data).
    *   No new Check-ins or Payroll runs allowed.
3.  **SUSPENDED**:
    *   Access is fully blocked.
    *   Tenant data is preserved for **90 days** before permanent deletion.
    *   Only "Emergency Data Export" is available.

---

## 🛠️ 5. Technical Implementation Roadmap

1.  **Model Updates**: Add `plan_type='FREE'` to the `Tenant` model choices.
2.  **Logic Update**: Update the `save()` method in `tenants/models.py` to auto-provision quotas for the new Free tier.
3.  **Checkout API**: Update `BillingViewSet` to handle "Add-on Block" purchases as a separate invoice type.
4.  **Capacity Check**: Refine `EmployeeViewSet.create` to check for `current_employees < (base_limit + purchased_addons)`.
5.  **Storage Isolation**: Implement tenant-isolated folders (`media/<schema_name>/`).
6.  **Storage Quota**: Implement `storage_used_bytes` tracking and block uploads exceeding `total_storage_capacity_mb`.

---
**Status**: Proposed / Under Review
**Draft Date**: April 17, 2026
