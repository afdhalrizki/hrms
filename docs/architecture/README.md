# 🏗️ System Architecture & Platform Design

This folder contains high-level system architecture documentation, infrastructure designs, and scalability strategies for the HariKerja HRMS platform. This documentation is the main reference for system architects, DevOps engineers, and senior developers to understand subsystem interactions and how scale is managed.

---

## 🧭 Document Guide & Parity

Documents in this folder are divided into several key architectural focuses, with most available in both English (`*.md`) and Indonesian (`*.id.md`) versions:

1.  **Authentication System ([auth_architecture.md](./auth_architecture.md)):** 
    Explains the JWT security lifecycle, cross-subdomain secure cookie management, and CSRF protection mechanisms.
2.  **AWS High Availability ([aws_high_availability_architecture.md](./aws_high_availability_architecture.md)):** 
    Guide to designing resilient AWS cloud infrastructure using Multi-AZ RDS, Auto-Scaling Groups, and Application Load Balancers.
3.  **Deployment Strategy ([deployment_strategy.md](./deployment_strategy.md)):** 
    Outlines zero-downtime release strategies including Blue-Green Deployments and Canary Releases.
4.  **Email Architecture ([email_architecture.md](./email_architecture.md)):** 
    Details async email delivery architecture utilizing Redis as a broker and Celery task queues.
5.  **Fingerprint Integration ([fingerprint_integration_design.id.md](./fingerprint_integration_design.id.md)):** 
    Indonesian guide covering biometric device integrations communicating directly over TCP/IP protocols to cloud endpoints.
6.  **Multi-Tenancy System ([multi_tenancy_system.md](./multi_tenancy_system.md)):** 
    Technical breakdown of database-level isolation utilizing dynamic PostgreSQL schemas via `django-tenants`.
7.  **Scaling Guide ([scaling_architecture_guide.md](./scaling_architecture_guide.md)):** 
    Covers read-write database scaling, replication, Redis caching, and connection pooling via PgBouncer.
8.  **Security Assessment ([security_self_assessment_guide.md](./security_self_assessment_guide.md)):** 
    Internal security compliance checklists evaluating OWASP Top 10 vulnerabilities.

---

## 📊 Documentation Matrix: System Architecture

| File Name | Category | Primary Audience | Core Topic |
| :--- | :--- | :--- | :--- |
| **[auth_architecture.md](./auth_architecture.md)** | Security | Security, Developer | JWT, Secure cookies, CSRF protection, session management |
| **[aws_high_availability_architecture.md](./aws_high_availability_architecture.md)** | Cloud Infra | DevOps, Architect | AWS Multi-AZ RDS, Auto Scaling, ALB, High Availability |
| **[deployment_strategy.md](./deployment_strategy.md)** | Release & CI/CD | DevOps, Developer | Blue-Green, Canary release, zero-downtime |
| **[email_architecture.md](./email_architecture.md)** | Integration | Developer, Sysadmin | Email queue, Redis broker, Celery worker async |
| **[fingerprint_integration_design.id.md](./fingerprint_integration_design.id.md)** | Biometric | IoT/Hardware, Dev | Biometric TCP/IP protocol, data pulling log |
| **[multi_tenancy_system.md](./multi_tenancy_system.md)** | Database | DB Architect, Dev | Postgres schema isolation, django-tenants |
| **[scaling_architecture_guide.md](./scaling_architecture_guide.md)** | Optimization | DB Architect, DevOps | PgBouncer, DB replication, horizontal scaling |
| **[security_self_assessment_guide.md](./security_self_assessment_guide.md)** | Compliance | Security Auditor, Dev | OWASP self-audit checklist, encryption audits |

---
*This document is a part of the official HariKerja HRMS platform documentation.*
