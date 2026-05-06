# harikerja Feature Checklist & Roadmap

This document provides a comprehensive overview of the currently implemented features and the strategic roadmap for the harikerja HRMS platform.

## ✅ Existing Features (Completed)

### 🏗️ 1. System Foundation & Multi-Tenancy
- [x] **Schema-based Multi-Tenancy**: Isolated PostgreSQL schemas for 100% data security per tenant.
- [x] **Automated Provisioning**: Real-time schema creation and database seeding upon tenant approval.
- [x] **Dynamic Subdomain Routing**: Tenant identification via URL hostnames (e.g., `client.harikerja.com`).
- [x] **Tiered Resource Gating**: Feature masking and resource quotas (Employee count, Storage) based on plans.
- [x] **Global Admin Portal**: Centralized management for tenant registrations, billing, and system health.

### 👤 2. HR Master Data & User Identity
- [x] **Employee Profiles**: Comprehensive PII management (Personal, Banking, Family, Education).
- [x] **Organizational Structure**: Multi-branch support with Departments and dynamic Job Positions.
- [x] **Unified Authentication**: Shared login system for Web and Mobile with JWT rotation security.
- [x] **Hybrid RBAC**: Capability-based permissions with default roles (Admin, HR, Staff).
- [x] **Document Vault**: Secure uploads for KTP/NPWP and profile biometric photos.

### 📍 3. Attendance & Geofencing
- [x] **Smart Geofencing**: GPS-based clock-in/out validation against branch-specific coordinate radii.
- [x] **Biometric Verification**: Face recognition metadata logging for mobile attendance.
- [x] **Shift Management**: Support for fixed schedules and flexible shifts.
- [x] **Attendance Correction**: Employee request workflow for manual time adjustments with approval audit.
- [x] **Export Engines**: Real-time generation of PDF/Excel/CSV attendance reports.

### 💰 4. Payroll & Indonesian Tax (TER 2024)
- [x] **Pajak PPh 21**: Full compliance with the latest "Tarif Efektif Rata-rata" (TER 2024) regulations.
- [x] **BPJS Integration**: Automatic calculation for BPJS Kesehatan and Ketenagakerjaan (JKK, JKM, JHT, JP).
- [x] **Variable Pay**: Support for overtime, allowances, bonuses, and loan deductions.
- [x] **Digital Payslips**: Automated generation of secure PDF payslips with mobile access.
- [x] **Payroll Periods**: Multi-tenant period management with batch calculation capabilities.

### 📈 5. Performance & KPI Management
- [x] **KPI Strategy**: Definition of individual and department-level Key Performance Indicators.
- [x] **Appraisal Lifecycles**: Structured review stages (Draft, Under Review, Completed).
- [x] **Real-time Attainment**: Visualization of progress towards KPI targets.
- [x] **Multi-stage Approvals**: Integrated workflow for performance review finalization.

### 📱 6. Mobile & Self-Service (ESS)
- [x] **Unified Mobile App**: Native Flutter experience for all employee-facing tasks.
- [x] **Request Workflows**: Mobile submission for Leaves, Overtime, and Reimbursements.
- [x] **Real-time Balance**: Instant viewing of leave quotas and payslip history.
- [x] **Offline Resilience**: Robust handling of intermittent connectivity during clock-ins.

---

## 🚀 Future Roadmap (Planned)

### 📅 Phase 1: Q3-Q4 2026 (Quick Wins)
- [ ] **Real-time Notification System**: WebSocket-based alerts and Firebase Push Notifications.
- [ ] **Document Management System (DMS)**: OCR-powered document extraction and expiry tracking.
- [ ] **Enhanced Mobile Support**: Local SQLite cache for full offline attendance submission.

### 📅 Phase 2: Q1-Q2 2027 (Core Enhancements)
- [ ] **Advanced Analytics Dashboard**: Predictive turnover models and operational cost optimization.
- [ ] **Integration Hub**: Seamless sync with ERPs (SAP/Oracle) and Accounting software (QuickBooks/Jurnal).
- [ ] **Advanced Leave Management**: Pro-rated accrual engines and department-specific policies.

### 📅 Phase 3: Q3-Q4 2027 (Enterprise Features)
- [ ] **AI/ML Capabilities**: Fraud detection in attendance patterns and AI recruitment matching.
- [ ] **Business Intelligence Suite**: Drag-and-drop report builder and interactive data visualizations.
- [ ] **International Expansion**: Multi-currency support and localized compliance for 10+ countries.

---
**Last Updated**: May 7, 2026  
**Status**: Feature Parity Achieved (Phase B1-B7)
