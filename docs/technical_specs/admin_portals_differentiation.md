# Differentiation: Global Admin Portal vs. Django Admin

This document clarifies the architectural and functional differences between the **Global Admin Portal (SaaS Frontend)** and the **Django Admin (Backend Console)** in the HariKerja HRMS platform.

---

## 1. Quick Comparison Table

| Attribute | Global Admin Portal (SaaS Portal) | Django Admin (Backend Console) |
| :--- | :--- | :--- |
| **System Layer** | **Frontend (Next.js)** | **Backend (Django Python)** |
| **Primary URL** | `/login/portal-admin-secure-39f28j/` (Login Path) | `/django-admin-secure-39f28j/` (Secret URL) |
| **User Interface** | Modern, premium, custom-designed Next.js UI | Standard Django Admin server-side interface |
| **Data Interaction** | Via secure REST API (JWT authentication) | Direct Database Read/Write (CRUD) |
| **Target Users** | SaaS Superadmins, Support Agents, Sales, Billing | DevOps, Sysadmins, Core Backend Developers |
| **Access Control** | Global Role RBAC & JWT validation | `is_staff` and `is_superuser` database flags |

---

## 2. Global Admin Portal (SaaS Frontend Portal)
The **Global Admin Portal** is the official operational dashboard for running the SaaS business. It is a custom-built Next.js frontend application that communicates with the backend via REST APIs.

### Purpose & Features:
* **Tenant Management:** Approving or rejecting new corporate registrations, managing company quotas, and tracking subscription expiry dates.
* **Billing & Finance:** Modifying active SaaS plans, generating subscription invoices, and tracking business revenue.
* **Customer Support:** Resolving client platform tickets, assigning customer agents to companies, and managing help guidelines.
* **Security & Isolation:** Staff can perform administrative duties safely using a refined UI without any risk of accidentally deleting database rows.

---

## 3. Django Admin (Backend Console)
The **Django Admin** is the built-in Django framework administration console rendered directly by Python. It is used as a low-level database utility tool.

### Purpose & Features:
* **Direct Database Manipulation:** Direct CRUD operations on database tables (users, tenants, workflow logs, billing records) for debugging and data corrections.
* **System Settings Configuration:** Tweaking backend tables, defining Django permissions groups, and managing low-level system tokens.
* **DevOps & Sysadmin Focus:** Utilized only for emergency data recovery, troubleshooting backend routing, and validating direct schema migrations.

---

## 4. Architectural Relationship

```
                     ┌──────────────────────────────────┐
                     │          Operating Staff         │
                     └────────────────┬─────────────────┘
                                      │
             ┌────────────────────────┴────────────────────────┐
             ▼                                                 ▼
┌──────────────────────────┐                      ┌──────────────────────────┐
│   Global Admin Portal    │                      │       Django Admin       │
│    (Next.js Frontend)    │                      │     (Backend Console)    │
├──────────────────────────┤                      ├──────────────────────────┤
│ • URL: /login/portal-... │                      │ • URL: /django-admin-... │
│ • Beautiful Custom UI    │                      │ • Raw DB CRUD Access     │
│ • Secure REST APIs       │                      │ • Direct Python Engine   │
└────────────┬─────────────┘                      └────────────┬─────────────┘
             │ (REST API)                                      │ (Direct SQL)
             ▼                                                 ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                              Postgres Database                             │
└────────────────────────────────────────────────────────────────────────────┐
```

## 5. Security & Isolation Rule
To maintain database integrity, **all daily business operations must be conducted through the Global Admin Portal (Next.js)**. Access to the Django Admin backend console must be heavily restricted to DevOps personnel and only used as a last resort during emergency debugging.                 │ (Direct SQL)
             ▼                                                 ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                              Postgres Database                             │
└────────────────────────────────────────────────────────────────────────────┘
```

## 5. Security & Isolation Rule
To maintain database integrity, **all daily business operations must be conducted through the Global Admin Portal (Next.js)**. Access to the Django Admin backend console must be heavily restricted to DevOps personnel and only used as a last resort during emergency debugging.
