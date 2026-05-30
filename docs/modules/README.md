# 🧩 Functional System Modules

This folder contains detailed functional specifications for all core modules comprising the HariKerja HRMS platform. Each document outlines data models, business logic boundaries, API structures, and supported product features.

---

## 🧭 Document Guide & Parity

Module specifications are organized in separate files, available in both English (`*.md`) and Indonesian (`*.id.md`) versions:

1.  **Attendance Module (`attendance`):** 
    Covers GPS Geofencing configurations, shift management schedules, attendance correction requests, and employee leave requests.
2.  **Billing & Quota Module (`billing`):** 
    Manages tenant subscriptions, invoice generations integrated with Midtrans, and data usage auditing.
3.  **Core Data Module (`core`):** 
    Stores master structure models (Branches, Departments, Roles, Grades) and standard employee profile records.
4.  **Notification Module (`notifications`):** 
    Handles transactional and background notifications (via SMTP Email & Web Push) for workflow actions.
5.  **Payroll Module (`payroll`):** 
    Outlines calculation rules for compensation components (Base Salary, Allowances, Deductions, BPJS, PPh 21 tax), payslip approval gates, and PDF generators.
6.  **Performance Module (`performance`):** 
    Encompasses employee Key Performance Indicators (KPIs), yearly target settings, and periodic appraisal reviews.
7.  **Reimbursement Module (`reimbursement`):** 
    Manages employee expense claims, receipt attachments, and multi-tier HR approval matrices.
8.  **Support Module (`support`):** 
    Handles SaaS helpdesk tickets created by tenant HR Admins, resolving client technical support queries.
9.  **Tenants & Domain Module (`tenants`):** 
    Orchestrates the lifecycle of tenant subdomains, database schema provisioning, and registration approval gates.
10. **Users Module (`users`):** 
    Encompasses credential data stores, JWT token issuing, global RBAC permissions, and group bindings.

---

## 📊 Documentation Matrix: Core Modules

| File Name | Category | Primary Audience | Core Topic |
| :--- | :--- | :--- | :--- |
| **[attendance.md](file:///home/afdhal/data/hr/hrms/docs/modules/attendance.md)** | HR Feature | Developer, Tester | GPS Geofencing, work shifts, leave requests |
| **[attendance.id.md](file:///home/afdhal/data/hr/hrms/docs/modules/attendance.id.md)** | HR Feature | Developer, Tester | GPS Geofencing, work shifts, leave requests |
| **[billing.md](file:///home/afdhal/data/hr/hrms/docs/modules/billing.md)** | SaaS Business | DevOps, Finance | Midtrans invoice, subscriptions, quotas |
| **[billing.id.md](file:///home/afdhal/data/hr/hrms/docs/modules/billing.id.md)** | SaaS Business | DevOps, Finance | Midtrans invoice, subscriptions, quotas |
| **[core.md](file:///home/afdhal/data/hr/hrms/docs/modules/core.md)** | HR Data | Developer, BA | Org structure, employee biodata, NIK |
| **[core.id.md](file:///home/afdhal/data/hr/hrms/docs/modules/core.id.md)** | HR Data | Developer, BA | Org structure, employee biodata, NIK |
| **[notifications.md](file:///home/afdhal/data/hr/hrms/docs/modules/notifications.md)** | Utility | Developer | Email triggers, push notification, SMS |
| **[notifications.id.md](file:///home/afdhal/data/hr/hrms/docs/modules/notifications.id.md)** | Utility | Developer | Email triggers, push notification, SMS |
| **[payroll.md](file:///home/afdhal/data/hr/hrms/docs/modules/payroll.md)** | HR Feature | Developer, Finance | Payslip PDF, tax PPh21, BPJS, payroll approval |
| **[payroll.id.md](file:///home/afdhal/data/hr/hrms/docs/modules/payroll.id.md)** | HR Feature | Developer, Finance | Payslip PDF, tax PPh21, BPJS, payroll approval |
| **[performance.md](file:///home/afdhal/data/hr/hrms/docs/modules/performance.md)** | HR Feature | Developer, PM | KPI metrics, targets, employee appraisals |
| **[performance.id.md](file:///home/afdhal/data/hr/hrms/docs/modules/performance.id.md)** | HR Feature | Developer, PM | KPI metrics, targets, employee appraisals |
| **[reimbursement.md](file:///home/afdhal/data/hr/hrms/docs/modules/reimbursement.md)** | HR Feature | Developer, Finance | Expense claims, invoice uploads, approval flow |
| **[reimbursement.id.md](file:///home/afdhal/data/hr/hrms/docs/modules/reimbursement.id.md)** | HR Feature | Developer, Finance | Expense claims, invoice uploads, approval flow |
| **[support.md](file:///home/afdhal/data/hr/hrms/docs/modules/support.md)** | Support | Support Agent, Dev | Support tickets, customer helpdesk, SLA |
| **[support.id.md](file:///home/afdhal/data/hr/hrms/docs/modules/support.id.md)** | Support | Support Agent, Dev | Support tickets, customer helpdesk, SLA |
| **[tenants.md](file:///home/afdhal/data/hr/hrms/docs/modules/tenants.md)** | SaaS System | DevOps, Architect | Sub-domain routing, database tenant provisioning |
| **[tenants.id.md](file:///home/afdhal/data/hr/hrms/docs/modules/tenants.id.md)** | SaaS System | DevOps, Architect | Sub-domain routing, database tenant provisioning |
| **[users.md](file:///home/afdhal/data/hr/hrms/docs/modules/users.md)** | Security | Security, Developer | JWT authentication, hashing, global RBAC |
| **[users.id.md](file:///home/afdhal/data/hr/hrms/docs/modules/users.id.md)** | Security | Security, Developer | JWT authentication, hashing, global RBAC |

---
*This document is a part of the official HariKerja HRMS platform documentation.*
