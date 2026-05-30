# 🧩 Functional System Modules

This folder contains detailed functional specifications for all core modules comprising the HariKerja HRMS platform. Each document outlines data models, business logic boundaries, API structures, and supported product features.

---

## 🧭 Document Guide & Parity

Module specifications are organized in separate files, available in both English (`*.md`) and Indonesian (`*.id.md`) versions:

1.  **Attendance Module ([attendance.md](./attendance.md)):** 
    Covers GPS Geofencing configurations, shift management schedules, attendance correction requests, and employee leave requests.
2.  **Billing & Quota Module ([billing.md](./billing.md)):** 
    Manages tenant subscriptions, invoice generations integrated with Midtrans, and data usage auditing.
3.  **Core Data Module ([core.md](./core.md)):** 
    Stores master structure models (Branches, Departments, Roles, Grades) and standard employee profile records.
4.  **Notification Module ([notifications.md](./notifications.md)):** 
    Handles transactional and background notifications (via SMTP Email & Web Push) for workflow actions.
5.  **Payroll Module ([payroll.md](./payroll.md)):** 
    Outlines calculation rules for compensation components (Base Salary, Allowances, Deductions, BPJS, PPh 21 tax), payslip approval gates, and PDF generators.
6.  **Performance Module ([performance.md](./performance.md)):** 
    Encompasses employee Key Performance Indicators (KPIs), yearly target settings, and periodic appraisal reviews.
7.  **Reimbursement Module ([reimbursement.md](./reimbursement.md)):** 
    Manages employee expense claims, receipt attachments, and multi-tier HR approval matrices.
8.  **Support Module ([support.md](./support.md)):** 
    Handles SaaS helpdesk tickets created by tenant HR Admins, resolving client technical support queries.
9.  **Tenants & Domain Module ([tenants.md](./tenants.md)):** 
    Orchestrates the lifecycle of tenant subdomains, database schema provisioning, and registration approval gates.
10. **Users Module ([users.md](./users.md)):** 
    Encompasses credential data stores, JWT token issuing, global RBAC permissions, and group bindings.

---

## 📊 Documentation Matrix: Core Modules

| File Name | Category | Primary Audience | Core Topic |
| :--- | :--- | :--- | :--- |
| **[attendance.md](./attendance.md)** | HR Feature | Developer, Tester | GPS Geofencing, work shifts, leave requests |
| **[billing.md](./billing.md)** | SaaS Business | DevOps, Finance | Midtrans invoice, subscriptions, quotas |
| **[core.md](./core.md)** | HR Data | Developer, BA | Org structure, employee biodata, NIK |
| **[notifications.md](./notifications.md)** | Utility | Developer | Email triggers, push notification, SMS |
| **[payroll.md](./payroll.md)** | HR Feature | Developer, Finance | Payslip PDF, tax PPh21, BPJS, payroll approval |
| **[performance.md](./performance.md)** | HR Feature | Developer, PM | KPI metrics, targets, employee appraisals |
| **[reimbursement.md](./reimbursement.md)** | HR Feature | Developer, Finance | Expense claims, invoice uploads, approval flow |
| **[support.md](./support.md)** | Support | Support Agent, Dev | Support tickets, customer helpdesk, SLA |
| **[tenants.md](./tenants.md)** | SaaS System | DevOps, Architect | Sub-domain routing, database tenant provisioning |
| **[users.md](./users.md)** | Security | Security, Developer | JWT authentication, hashing, global RBAC |

---
*This document is a part of the official HariKerja HRMS platform documentation.*
