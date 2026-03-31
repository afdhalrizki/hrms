# Future Feature: AI Support Assistant & Ticketing System

This document outlines the blueprint for the **Internal Support Ticketing System**, which will eventually evolve into an **AI-powered Support Assistant**. This system is designed to provide high-security, multi-tenant helpdesk capabilities integrated directly into the harikerja HRMS ecosystem.

## 🤖 AI Evolution Path
1.  **Phase 1: Structured Ticketing** (Current Blueprint)
    -   Manual ticket creation and human response.
2.  **Phase 2: AI Suggestion Engine**
    -   As employees type their issue, the AI suggests answers from the company's HR Policy Handbooks (stored in the Knowledge Base).
3.  **Phase 3: Automated Resolution**
    -   AI handles routine inquiries (e.g., "How do I update my NPWP?") and only escalates complex payroll issues to human HR admins.

## 🏗️ Technical Architecture (Shared/Tenant Base)

### Backend Models (Django)
*   **Ticket**:
    -   `tenant`: Multi-tenant isolation.
    -   `user`: Creator (Employee).
    -   `category`: Payroll, Attendance, Technical, General.
    -   `priority`: Low, Medium, High, Urgent.
    -   `status`: Open, In Progress, Resolved, Closed.
*   **TicketMessage**:
    -   Threaded communication.
    -   `is_internal`: Boolean for staff-only private notes.
*   **TicketAttachment**:
    -   File uploads (Bug screenshots, Salary discrepancy proofs).

### API Endpoints
- `GET /api/tickets/`: List user's tickets or all tenant tickets (for Admin).
- `POST /api/tickets/`: Create a new ticket.
- `POST /api/tickets/{id}/add_message/`: Reply to a thread.
- `POST /api/tickets/{id}/resolve/`: Mark as resolved.

## 🎨 UI/UX Requirements
- **Admin Dashboard**: A "Mission Control" center for HR to manage high-volume requests.
- **Mobile App**: A clean "Help & Support" section in the ESS (Employee Self-Service) app.
- **Micro-interactions**: Real-time status badges and typing indicators for active support threads.

## 🔒 Security & Privacy
- **Audit Logging**: Every ticket status change and message must be audited.
- **RBAC**: Employees can only see their own tickets; HR Managers see tickets for their tenant; Global Admins see all.
