# 🏗️ System Architecture & Platform Design

This folder contains high-level system architecture documentation, infrastructure designs, and scalability strategies for the HariKerja HRMS platform. This documentation is the main reference for system architects, DevOps engineers, and senior developers to understand subsystem interactions and how scale is managed.

---

## 🧭 Document Guide & Parity

Documents in this folder are divided into several key architectural focuses, with most available in both English (`*.md`) and Indonesian (`*.id.md`) versions:

1.  **Authentication System (`auth_architecture`):** 
    Explains the JWT security lifecycle, cross-subdomain secure cookie management, and CSRF protection mechanisms.
2.  **AWS High Availability (`aws_high_availability_architecture`):** 
    Guide to designing resilient AWS cloud infrastructure using Multi-AZ RDS, Auto-Scaling Groups, and Application Load Balancers.
3.  **Deployment Strategy (`deployment_strategy`):** 
    Outlines zero-downtime release strategies including Blue-Green Deployments and Canary Releases.
4.  **Email Architecture (`email_architecture`):** 
    Details async email delivery architecture utilizing Redis as a broker and Celery task queues.
5.  **Fingerprint Integration (`fingerprint_integration_design.id.md`):** 
    Indonesian guide covering biometric device integrations communicating directly over TCP/IP protocols to cloud endpoints.
6.  **Multi-Tenancy System (`multi_tenancy_system`):** 
    Technical breakdown of database-level isolation utilizing dynamic PostgreSQL schemas via `django-tenants`.
7.  **Scaling Guide (`scaling_architecture_guide`):** 
    Covers read-write database scaling, replication, Redis caching, and connection pooling via PgBouncer.
8.  **Security Assessment (`security_self_assessment_guide`):** 
    Internal security compliance checklists evaluating OWASP Top 10 vulnerabilities.

---

## 📊 Documentation Matrix: System Architecture

| File Name | Category | Primary Audience | Core Topic |
| :--- | :--- | :--- | :--- |
| **[auth_architecture.md](file:///home/afdhal/data/hr/hrms/docs/architecture/auth_architecture.md)** | Security | Security, Developer | JWT, Secure cookies, CSRF protection, session management |
| **[auth_architecture.id.md](file:///home/afdhal/data/hr/hrms/docs/architecture/auth_architecture.id.md)** | Security | Security, Developer | JWT, Secure cookies, CSRF protection, session management |
| **[aws_high_availability_architecture.md](file:///home/afdhal/data/hr/hrms/docs/architecture/aws_high_availability_architecture.md)** | Cloud Infra | DevOps, Architect | AWS Multi-AZ RDS, Auto Scaling, ALB, High Availability |
| **[aws_high_availability_architecture.id.md](file:///home/afdhal/data/hr/hrms/docs/architecture/aws_high_availability_architecture.id.md)** | Cloud Infra | DevOps, Architect | AWS Multi-AZ RDS, Auto Scaling, ALB, High Availability |
| **[deployment_strategy.md](file:///home/afdhal/data/hr/hrms/docs/architecture/deployment_strategy.md)** | Release & CI/CD | DevOps, Developer | Blue-Green, Canary release, zero-downtime |
| **[deployment_strategy.id.md](file:///home/afdhal/data/hr/hrms/docs/architecture/deployment_strategy.id.md)** | Release & CI/CD | DevOps, Developer | Blue-Green, Canary release, zero-downtime |
| **[email_architecture.md](file:///home/afdhal/data/hr/hrms/docs/architecture/email_architecture.md)** | Integration | Developer, Sysadmin | Email queue, Redis broker, Celery worker async |
| **[email_architecture.id.md](file:///home/afdhal/data/hr/hrms/docs/architecture/email_architecture.id.md)** | Integration | Developer, Sysadmin | Email queue, Redis broker, Celery worker async |
| **[fingerprint_integration_design.id.md](file:///home/afdhal/data/hr/hrms/docs/architecture/fingerprint_integration_design.id.md)** | Biometric | IoT/Hardware, Dev | Biometric TCP/IP protocol, data pulling log |
| **[multi_tenancy_system.md](file:///home/afdhal/data/hr/hrms/docs/architecture/multi_tenancy_system.md)** | Database | DB Architect, Dev | Postgres schema isolation, django-tenants |
| **[multi_tenancy_system.id.md](file:///home/afdhal/data/hr/hrms/docs/architecture/multi_tenancy_system.id.md)** | Database | DB Architect, Dev | Postgres schema isolation, django-tenants |
| **[scaling_architecture_guide.md](file:///home/afdhal/data/hr/hrms/docs/architecture/scaling_architecture_guide.md)** | Optimization | DB Architect, DevOps | PgBouncer, DB replication, horizontal scaling |
| **[scaling_architecture_guide.id.md](file:///home/afdhal/data/hr/hrms/docs/architecture/scaling_architecture_guide.id.md)** | Optimization | DB Architect, DevOps | PgBouncer, DB replication, horizontal scaling |
| **[security_self_assessment_guide.md](file:///home/afdhal/data/hr/hrms/docs/architecture/security_self_assessment_guide.md)** | Compliance | Security Auditor, Dev | OWASP self-audit checklist, encryption audits |
| **[security_self_assessment_guide.id.md](file:///home/afdhal/data/hr/hrms/docs/architecture/security_self_assessment_guide.id.md)** | Compliance | Security Auditor, Dev | OWASP self-audit checklist, encryption audits |

---
*This document is a part of the official HariKerja HRMS platform documentation.*
