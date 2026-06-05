# ⚙️ Technical Specifications & Implementation Guides

This folder contains detailed technical specifications, network security infrastructure deployment guides, API references, security compliance audits, and hands-on developer/client manuals for the HariKerja HRMS platform.

---

## 🧭 Document Guide & Parity

Technical documentation files are categorized into several core topics, available in both English (`*.md`) and Indonesian (`*.id.md`) versions:

1.  **Admin Protection Strategy ([admin_portal_protection_strategy.md](./admin_portal_protection_strategy.md)):** 
    Defense-in-depth concepts protecting backend administrative panels.
2.  **Admin Portals Differentiation ([admin_portals_differentiation.md](./admin_portals_differentiation.md)):** 
    Contrasts the functional focus, URL endpoints, and targets of *Django Admin* versus *Next.js SaaS Portal*.
3.  **Admin Portals Review ([admin_portals_review.md](./admin_portals_review.md)):** 
    In-depth review of admin portal code alignment, network security status (VPN & Cloudflare), test coverage, and future recommendations.
4.  **API Reference ([api_reference.md](./api_reference.md)):** 
    JSON schema definitions, JWT Bearer tokens, exception responses, and integration guides for API endpoints.
5.  **Client Access Guide ([client_access_guide.md](./client_access_guide.md)):** 
    End-user instructions for administrative staff to securely connect to the panels under both VPN-Only and Cloudflare Zero Trust profiles.
6.  **Cloudflare Zero Trust Guide ([cloudflare_zero_trust_guide.md](./cloudflare_zero_trust_guide.md)):** 
    DevOps guide to configure `cloudflared` outbound tunnels and Cloudflare Access PIN challenge policies.
7.  **Developer Guide ([developer_guide.md](./developer_guide.md)):** 
    Full-stack developer manual outlining system architectures, multi-tenant databases, coding standards, and test guides.
8.  **Security Audit ([security_audit.md](./security_audit.md)):** 
    OWASP Top 10 penetration testing audits, AES-256 database column encryption checks, and security updates.
9.  **VPN Connection Guide ([vpn_connection_guide.md](./vpn_connection_guide.md)):** 
    DevOps manual to install OpenVPN/WireGuard, set up `ufw` NAT routing, and configure Nginx proxy whitelists.
10. **Payment Environment Guide ([payment_environment_guide.md](./payment_environment_guide.md)):**
    Details Midtrans sandbox configuration, live bank account routing, and production migration guide.
11. **QA Operations Guide ([qa_operations_guide.md](./qa_operations_guide.md)):**
    Operational guide for running Django shell commands, database migrations, and diagnostic checks on the QA server.

---

## 📊 Documentation Matrix: Technical Specifications

| File Name | Category | Primary Audience | Core Topic |
| :--- | :--- | :--- | :--- |
| **[admin_portal_protection_strategy.md](./admin_portal_protection_strategy.md)** | Security | Security, Architect | Defense-in-depth administrative portals |
| **[admin_portals_differentiation.md](./admin_portals_differentiation.md)** | Architecture | Sysadmin, Developer | Functional isolation Django vs Next.js admin |
| **[admin_portals_review.md](./admin_portals_review.md)** | Audit & Review | Staf Management, DevOps | Code alignment, VPN/Cloudflare status, test coverage |
| **[api_reference.md](./api_reference.md)** | Integration | Developer, Third-Party | JSON endpoint schema, JWT Bearer, exception codes |
| **[client_access_guide.md](./client_access_guide.md)** | Operations | Staf Admin, Support, QA | Client connection configs via VPN or Cloudflare |
| **[cloudflare_zero_trust_guide.md](./cloudflare_zero_trust_guide.md)** | Networking | DevOps, Sysadmin | Argo Tunnel cloudflared, SSO Email PIN Access |
| **[developer_guide.md](./developer_guide.md)** | Development | Full-stack Developer | Local dev up.mjs, multi-tenant schema, testing |
| **[payment_environment_guide.md](./payment_environment_guide.md)** | Integration | DevOps, Developer | Midtrans sandbox, live merchant banking, production configs |
| **[qa_operations_guide.md](./qa_operations_guide.md)** | Operations | DevOps, Developer | QA server diagnostics, django shell, container management |
| **[security_audit.md](./security_audit.md)** | Compliance | Security Auditor, Dev | OWASP Top 10 penetration testing, DB encryption |
| **[vpn_connection_guide.md](./vpn_connection_guide.md)** | Networking | DevOps, Sysadmin | OpenVPN server build, ufw NAT routing, Nginx allow/deny |

---
*This document is a part of the official HariKerja HRMS platform documentation.*
