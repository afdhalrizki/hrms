# ⚙️ Technical Specifications & Implementation Guides

This folder contains detailed technical specifications, network security infrastructure deployment guides, API references, security compliance audits, and hands-on developer/client manuals for the HariKerja HRMS platform.

---

## 🧭 Document Guide & Parity

Technical documentation files are categorized into several core topics, available in both English (`*.md`) and Indonesian (`*.id.md`) versions:

1.  **Admin Protection Strategy (`admin_portal_protection_strategy`):** 
    Defense-in-depth concepts protecting backend administrative panels.
2.  **Admin Portals Differentiation (`admin_portals_differentiation`):** 
    Contrasts the functional focus, URL endpoints, and targets of *Django Admin* versus *Next.js SaaS Portal*.
3.  **Admin Portals Review (`admin_portals_review`):** 
    In-depth review of admin portal code alignment, network security status (VPN & Cloudflare), test coverage, and future recommendations.
4.  **API Reference (`api_reference`):** 
    JSON schema definitions, JWT Bearer tokens, exception responses, and integration guides for API endpoints.
5.  **Client Access Guide (`client_access_guide`):** 
    End-user instructions for administrative staff to securely connect to the panels under both VPN-Only and Cloudflare Zero Trust profiles.
6.  **Cloudflare Zero Trust Guide (`cloudflare_zero_trust_guide`):** 
    DevOps guide to configure `cloudflared` outbound tunnels and Cloudflare Access PIN challenge policies.
7.  **Developer Guide (`developer_guide`):** 
    Full-stack developer manual outlining system architectures, multi-tenant databases, coding standards, and test guides.
8.  **Security Audit (`security_audit`):** 
    OWASP Top 10 penetration testing audits, AES-256 database column encryption checks, and security updates.
9.  **VPN Connection Guide (`vpn_connection_guide`):** 
    DevOps manual to install OpenVPN/WireGuard, set up `ufw` NAT routing, and configure Nginx proxy whitelists.

---

## 📊 Documentation Matrix: Technical Specifications

| File Name | Category | Primary Audience | Core Topic |
| :--- | :--- | :--- | :--- |
| **[admin_portal_protection_strategy.md](file:///home/afdhal/data/hr/hrms/docs/technical_specs/admin_portal_protection_strategy.md)** | Security | Security, Architect | Defense-in-depth administrative portals |
| **[admin_portal_protection_strategy.id.md](file:///home/afdhal/data/hr/hrms/docs/technical_specs/admin_portal_protection_strategy.id.md)** | Security | Security, Architect | Defense-in-depth administrative portals |
| **[admin_portals_differentiation.md](file:///home/afdhal/data/hr/hrms/docs/technical_specs/admin_portals_differentiation.md)** | Architecture | Sysadmin, Developer | Functional isolation Django vs Next.js admin |
| **[admin_portals_differentiation.id.md](file:///home/afdhal/data/hr/hrms/docs/technical_specs/admin_portals_differentiation.id.md)** | Architecture | Sysadmin, Developer | Functional isolation Django vs Next.js admin |
| **[admin_portals_review.md](file:///home/afdhal/data/hr/hrms/docs/technical_specs/admin_portals_review.md)** | Audit & Review | Staf Management, DevOps | Code alignment, VPN/Cloudflare status, test coverage |
| **[admin_portals_review.id.md](file:///home/afdhal/data/hr/hrms/docs/technical_specs/admin_portals_review.id.md)** | Audit & Review | Staf Management, DevOps | Code alignment, VPN/Cloudflare status, test coverage |
| **[api_reference.md](file:///home/afdhal/data/hr/hrms/docs/technical_specs/api_reference.md)** | Integration | Developer, Third-Party | JSON endpoint schema, JWT Bearer, exception codes |
| **[api_reference.id.md](file:///home/afdhal/data/hr/hrms/docs/technical_specs/api_reference.id.md)** | Integration | Developer, Third-Party | JSON endpoint schema, JWT Bearer, exception codes |
| **[client_access_guide.md](file:///home/afdhal/data/hr/hrms/docs/technical_specs/client_access_guide.md)** | Operations | Staf Admin, Support, QA | Client connection configs via VPN or Cloudflare |
| **[client_access_guide.id.md](file:///home/afdhal/data/hr/hrms/docs/technical_specs/client_access_guide.id.md)** | Operations | Staf Admin, Support, QA | Client connection configs via VPN or Cloudflare |
| **[cloudflare_zero_trust_guide.md](file:///home/afdhal/data/hr/hrms/docs/technical_specs/cloudflare_zero_trust_guide.md)** | Networking | DevOps, Sysadmin | Argo Tunnel cloudflared, SSO Email PIN Access |
| **[cloudflare_zero_trust_guide.id.md](file:///home/afdhal/data/hr/hrms/docs/technical_specs/cloudflare_zero_trust_guide.id.md)** | Networking | DevOps, Sysadmin | Argo Tunnel cloudflared, SSO Email PIN Access |
| **[developer_guide.md](file:///home/afdhal/data/hr/hrms/docs/technical_specs/developer_guide.md)** | Development | Full-stack Developer | Local dev up.mjs, multi-tenant schema, testing |
| **[developer_guide.id.md](file:///home/afdhal/data/hr/hrms/docs/technical_specs/developer_guide.id.md)** | Development | Full-stack Developer | Local dev up.mjs, multi-tenant schema, testing |
| **[security_audit.md](file:///home/afdhal/data/hr/hrms/docs/technical_specs/security_audit.md)** | Compliance | Security Auditor, Dev | OWASP Top 10 penetration testing, DB encryption |
| **[security_audit.id.md](file:///home/afdhal/data/hr/hrms/docs/technical_specs/security_audit.id.md)** | Compliance | Security Auditor, Dev | OWASP Top 10 penetration testing, DB encryption |
| **[vpn_connection_guide.md](file:///home/afdhal/data/hr/hrms/docs/technical_specs/vpn_connection_guide.md)** | Networking | DevOps, Sysadmin | OpenVPN server build, ufw NAT routing, Nginx allow/deny |
| **[vpn_connection_guide.id.md](file:///home/afdhal/data/hr/hrms/docs/technical_specs/vpn_connection_guide.id.md)** | Networking | DevOps, Sysadmin | OpenVPN server build, ufw NAT routing, Nginx allow/deny |

---
*This document is a part of the official HariKerja HRMS platform documentation.*
