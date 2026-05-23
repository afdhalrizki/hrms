# Email Architecture & Mapping

This document describes the email communication architecture of the HRMS platform. The system supports sending transactional notifications, handling customer support tickets, and managing sales & billing inquiries at both the global and organizational (tenant) levels.

---

## 1. Future Email Architecture Vision
To support operational requirements, the system will map all communication channels into **3 core email channels** based on the company's domain name (`@domainname`):

```mermaid
graph TD
    System[HRMS App / Engine] -->|Automatic Notifications| Noreply[noreply@domainname]
    User[Employee / Tenant Admin] -->|Technical Assistance & Tickets| Support[support@domainname]
    Lead[Prospect / Client] -->|Inquiries & Billing| Sales[sales@domainname]

    Noreply -->|Send SMTP| TargetUser[Recipient Email]
    Support -->|Ticket Integration| Helpdesk[Support / Ticketing Module]
    Sales -->|Billing Integration| CRM[Billing Module / Sales CRM]
```

### Core Email Channels Details & Mapping:

| Email Channel | Flow Direction | Description & Use Cases | System Integration |
| :--- | :--- | :--- | :--- |
| **`noreply@domainname`** | **Outgoing (SMTP)** | System-generated automatic transactional emails. <br>• OTP (One-Time Password) delivery<br>• Digital payslips (Payroll)<br>• Leave & claim approval notifications<br>• Attendance reminders. | Configured via `DEFAULT_FROM_EMAIL` and SMTP settings in Django environment variables. |
| **`support@domainname`** | **Bi-directional** | Customer support and technical ticketing.<br>• Login/access troubleshooting<br>• Bug reporting<br>• "Help & Support" module integration for global and tenant admins. | Connected to the internal `Help & Support` ticketing module or an external helpdesk API. |
| **`sales@domainname`** | **Bi-directional** | Commercial, sales, and billing inquiries.<br>• New tenant onboarding (Enterprise)<br>• Plan pricing inquiries<br>• Invoices and payment confirmation notifications. | Integrated with the Public Tenant Registration and the `Billing` module for invoice alerts. |

---

## 2. Email Mapping Across Environments
To support the software development lifecycle (SDLC), email configurations are dynamically mapped across different environments in their respective `.env` files:

| Environment | SMTP Authenticated User (`EMAIL_HOST_USER`) | Sender Email (`DEFAULT_FROM_EMAIL`) | Status / Notes |
| :--- | :--- | :--- | :--- |
| **Local / Development** <br>(`.env.local`) | *(Empty)* | `noreply@{TENANT_DOMAIN_SUFFIX}` <br>*(Falls back to `noreply@localhost`)* | Used for local development. Outgoing emails are typically captured via the backend console or a mock mailer (e.g. Mailpit). |
| **QA / Testing** <br>(`.env.qa`) | `your-email@gmail.com` | `noreply@harikerja.web.id` | Active configuration in the QA environment (`harikerja.web.id`) using Gmail SMTP as a sandbox. |
| **Staging** <br>(`.env.staging_1k`) | `staging-email@domain.com` | `noreply@staging-1k.yourdomain.com` | Used for final pre-release testing. |
| **Production (Medium-Scale)** <br>(`.env.production_1k`) | `your-email@domain.com` | `noreply@yourdomain.com` | Production config template for standard organizational deployment. |
| **Production (Large-Scale)** <br>(`.env.production_10k`) | `production-email@harikerja.com` | `noreply@harikerja.com` | Active configuration on the main production server with the official **`harikerja.com`** domain. |

---

## 3. Seeded & Dummy Email Accounts (Database Defaults)
In addition to SMTP service configurations, the system has seeded database records used for testing multi-tenant workflows and approval configurations:

### A. Public Schema (Global-Admin)
Used for platform-wide administration via the Global Console:
*   **`superadmin@harikerja.com`**: Primary Global Super Administrator account.
*   **`admin@pending.com`**: Simulated tenant registration with status *PENDING*.
*   **`admin@approved.com`**: Simulated tenant registration with status *APPROVED*.

### B. Tenant Schema (Employees & Company Admins)
Dynamically created for each tenant (e.g. `company1`, `company2`, `worker_0`, etc.) with default password `password123`:
*   **`admin@{tenant}.com`** (e.g. `admin@company1.com`): Primary Tenant Administrator.
*   **`manager1@{tenant}.com`** (e.g. `manager1@company1.com`): Manager (approver in workflow steps).
*   **`employee1@{tenant}.com`** to **`employee5@{tenant}.com`**: Regular employees with access to attendance, payroll, and reimbursement.

---

## 4. Implementation & Configuration Guide
Once your official production domain is ready (e.g., `yourcompany.com`), you can update the environment variables in your active `.env` file as follows:

### Outgoing Email Settings (Notifications):
```env
# deploy/environments/.env.production
ENABLE_EMAIL_NOTIFICATIONS=True
EMAIL_HOST=smtp.mailgun.org # Or your preferred SMTP provider
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=noreply@yourcompany.com
EMAIL_HOST_PASSWORD=secure-smtp-password
DEFAULT_FROM_EMAIL=noreply@yourcompany.com
```

### Incoming Email Settings (Support & Sales):
Handling incoming emails (`support@` and `sales@`) is typically accomplished using webhook forwarding or email routing services:
1.  **Sales**: Billing flows will trigger automated notifications copying `sales@yourcompany.com` upon invoice generation or payment success.
2.  **Support**: Incoming emails sent to `support@yourcompany.com` can be forwarded by your mail server to the `/api/support/tickets/` endpoint to automatically generate helpdesk tickets within the HRMS application.
