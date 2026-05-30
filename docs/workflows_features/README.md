# 🔄 System Workflows & Functional Diagrams

This folder contains comprehensive documentation regarding business workflows, platform operational procedures, functional interaction diagrams, git branching strategy, and feature roadmaps on the HariKerja HRMS platform.

---

## 🧭 Document Guide & Parity

Workflow documentation is categorized into several major topics, available in both English (`*.md`) and Indonesian (`*.id.md`) versions:

1.  **Deployment & Branching ([deployment_and_branching.md](./deployment_and_branching.md)):** 
    Git branching models (Main, Develop, Feature branches) and CI/CD automation pipelines from dev to production.
2.  **Employee Lifecycle ([employee_lifecycle.md](./employee_lifecycle.md)):** 
    Employee transition states including Onboarding, probation review, active service, promotions, and resignations/retirements.
3.  **Feature Gaps & Roadmap ([feature_gaps_and_roadmap.md](./feature_gaps_and_roadmap.md)):** 
    Identifies functional discrepancies between the mobile and web clients, mapping roadmaps to reach feature parity.
4.  **Feature Map & Platform Comparison ([feature_map_and_platform_comparison.md](./feature_map_and_platform_comparison.md)):** 
    Contrasts functional parity between Next.js web client, Flutter mobile client, and competitor HR systems.
5.  **Future AI Support ([future_support_ai.md](./future_support_ai.md)):** 
    Conceptual design to integrate Large Language Models (LLMs) to analyze employee performance and automate HR support.
6.  **Ticketing System Design ([help_support_ticketing_design.md](./help_support_ticketing_design.md)):** 
    Service flow of helpdesk tickets, from employee issue submission to IT agent resolution.
7.  **HRMS Operations ([hrms_operations_workflow.md](./hrms_operations_workflow.md)):** 
    End-to-end operational diagram mapping database integrations for core data, attendance, and payroll.
8.  **Mobile App Workflows ([mobile_app_workflows.md](./mobile_app_workflows.md)):** 
    Details Flutter screen flows, secure credential storage, and offline geofenced attendance synchronization.
9.  **Notification System ([notification_system.md](./notification_system.md)):** 
    Async notification triggers issuing automated, priority emails and mobile/web push notifications.
10. **RBAC Security ([rbac_security.md](./rbac_security.md)):** 
    Tenant-level role authorization schemas isolating privileges for Admin, Manager, and Employee roles.
11. **Subscription & Billing ([registration_subscription_billing.md](./registration_subscription_billing.md)):** 
    SaaS signup flows, company domain provisioning, 14-day trials, and Midtrans checkout integrations.
12. **Web App Workflows ([web_app_workflows.md](./web_app_workflows.md)):** 
    Next.js dashboard page routing specifications, JWT session management, and API exception handling.

---

## 📊 Documentation Matrix: Workflows & Features

| File Name | Category | Primary Audience | Core Topic |
| :--- | :--- | :--- | :--- |
| **[deployment_and_branching.md](./deployment_and_branching.md)** | DevOps | Developer, DevOps | Git branching model, CI/CD pipeline |
| **[employee_lifecycle.md](./employee_lifecycle.md)** | HR Business | BA, Developer | Employee status states, contract lifecycle |
| **[feature_gaps_and_roadmap.md](./feature_gaps_and_roadmap.md)** | Tracking | PM, Product Owner | Parity gaps between client apps, roadmaps |
| **[feature_map_and_platform_comparison.md](./feature_map_and_platform_comparison.md)** | Analysis | PM, BA | Competitor comparisons, modular checklists |
| **[future_support_ai.md](./future_support_ai.md)** | Planning | Product Owner, Dev | LLM integration, HR chatbot, AI recruitment |
| **[help_support_ticketing_design.md](./help_support_ticketing_design.md)** | Support | Support Agent, Dev | Support ticket escalations, ticketing workflows |
| **[hrms_operations_workflow.md](./hrms_operations_workflow.md)** | Diagram | Developer, Architect | Integrated data logs chart, attendance, payroll |
| **[mobile_app_workflows.md](./mobile_app_workflows.md)** | Mobile | Flutter Developer | Flutter screen flows, secure storage, offline geofence |
| **[notification_system.md](./notification_system.md)** | Utility | Developer | Async SMTP triggers, web push notifications |
| **[rbac_security.md](./rbac_security.md)** | Security | Security, Developer | Tenant authorization, Admin, Manager roles |
| **[registration_subscription_billing.md](./registration_subscription_billing.md)** | SaaS Business | DevOps, Finance | Tenant signup, 14-day trials, Midtrans integration |
| **[web_app_workflows.md](./web_app_workflows.md)** | Web | Next.js Developer | Next.js visual routing, auth state, API fetch |

---
*This document is a part of the official HariKerja HRMS platform documentation.*
