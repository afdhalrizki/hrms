# Tenant Subscription Plans

This document provides a comprehensive overview of the available subscription plans within the HRMS platform. Each plan is designed to cater to different business scales and operational requirements, with specific module gating and resource quotas.

## 1. Plan Overview
The system offers four distinct tiers to support organizations from startups to large enterprises:

1.  **ESSENTIAL HR**: Entry-level package for basic digitalization of employee records and attendance.
2.  **PROFESSIONAL**: Growth-oriented package including automated payroll and reimbursement management.
3.  **PREMIUM**: Comprehensive package with performance management and KPI tracking features.
4.  **ENTERPRISE**: Ultimate package providing advanced analytics, multi-shift scheduling, and complete audit trails.

## 2. Feature & Quota Comparison Matrix

| Feature / Benefit | **ESSENTIAL HR** | **PROFESSIONAL** | **PREMIUM** | **ENTERPRISE** |
| :--- | :--- | :--- | :--- | :--- |
| **Pricing (IDR)** | **Rp 250.000 /mo** | **Rp 750.000 /mo** | **Rp 1.500.000 /mo** | **Contact Us** |
| **Billing Cycle** | Annual Only | Monthly/Annual | Monthly/Annual | Custom |
| **Employee Limit** | 50 | 500 | 2,000 | 10,000+ |
| **Storage Limit** | **100 MB** | **2 GB** | **5 GB** | **20 GB** |
| **Employee Data (Core)** | ✅ Basic | ✅ Advanced | ✅ Advanced | ✅ Advanced |
| **Attendance** | ✅ Basic (Check-in/out) | ✅ Geofencing & Photo | ✅ Attendance Correction | ✅ Advanced (Shift & Roster) |
| **Leave & Permits** | ✅ Single-stage | ✅ Multi-stage | ✅ Multi-stage | ✅ Multi-stage |
| **Payroll** | ❌ Not Available | ✅ PPh 21 & BPJS | ✅ Bonus & Loans | ✅ Payroll Analytics |
| **Reimbursement** | ❌ Not Available | ✅ Standard | ✅ Approval Workflow | ✅ Advanced Tracking |
| **Performance** | ❌ Not Available | ❌ Not Available | ✅ KPI & Review | ✅ Analytics & Coaching |
| **Security & Auditing** | ❌ Not Available | ❌ Not Available | ✅ Role-based Access | ✅ Audit Trail & Syslog |

---

## 3. Technical Implementation (Module Gating)

Feature access is enforced through the system's modular gating engine. Enabling a plan automatically provisions the following module sets:

*   **ESSENTIAL:** `['core', 'attendance']`
*   **PROFESSIONAL:** `['core', 'attendance', 'payroll', 'reimbursement']`
*   **PREMIUM:** `['core', 'attendance', 'payroll', 'reimbursement', 'performance']`
*   **ENTERPRISE:** Access to all core modules, including `analytics` and `audit`.

## 4. Storage & Data Isolation
With the latest implementation of **Tenant Storage Isolation**, data security and quota management are handled exhaustively:
*   **Isolated Folders**: Every tenant has a dedicated physical directory (`media/<schema_name>/`).
*   **Exhaustive Tracking**: The storage limit covers all system uploads including Profile Photos, KTP/NPWP Scans, Reimbursement Receipts, and Attendance Photos.
*   **Quota Enforcement**:
    *   **WARNING (90%)**: System triggers an in-app alert to administrators.
    *   **CRITICAL (100%)**: New file uploads are temporarily blocked until the quota is expanded or files are cleaned up.
*   **Elastic Quota (Add-on)**: Tenants can purchase additional storage in 1 GB increments without the need to upgrade their entire subscription plan.

## 5. Billing & Subscription Compliance

Our plan structure is built specifically with the Indonesian market in mind:
1.  **Compliance-First**: BPJS and PPh 21 support (TER 2024) is built-in for all Professional users and above.
2.  **Scalable Quotas**: Generous employee limits that grow with your business, up to unlimited enterprise support.
3.  **Automated Integrity**: Powered by **Midtrans Payment Gateway** for seamless renewals and high-security compliance.
4.  **Grace Period**: All plans include a 14-day grace period after expiry before entering **Suspended (Block)** mode.

---

**Last Updated**: April 17, 2026
**Status**: Active (Renewal Automation in Progress)
