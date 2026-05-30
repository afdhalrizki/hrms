# 🔄 Alur Kerja Sistem & Diagram Fungsional

Folder ini berisi dokumentasi komprehensif mengenai alur kerja bisnis (*business workflows*), proses operasional platform, diagram interaksi fungsional, arsitektur percabangan git (*branching strategy*), serta peta jalan fitur pada platform HariKerja HRMS.

---

## 🧭 Panduan & Perbedaan Berkas Dokumen

Dokumentasi alur kerja dikelompokkan ke dalam beberapa topik utama yang tersedia dalam versi Bahasa Indonesia (`*.id.md`) dan Bahasa Inggris (`*.md`):

1.  **Deployment & Percabangan (`deployment_and_branching`):** 
    Strategi branching Git (Main, Develop, Feature branch) dan alur CI/CD dari lokal hingga produksi.
2.  **Siklus Hidup Karyawan (`employee_lifecycle`):** 
    Tahapan status karyawan dari mulai pendaftaran (Onboarding), evaluasi probation, aktif bekerja, mutasi, hingga resign/pensiun.
3.  **Kesenjangan Fitur & Roadmap (`feature_gaps_and_roadmap`):** 
    Analisis kesenjangan modul yang belum diimplementasikan di mobile/web serta peta jalan penyelesaiannya.
4.  **Peta Fitur & Perbandingan Platform (`feature_map_and_platform_comparison`):** 
    Perbandingan kesetaraan fungsionalitas antara web client, mobile client, serta aplikasi HR kompetitor.
5.  **Masa Depan Fitur AI (`future_support_ai`):** 
    Konseptual rencana integrasi kecerdasan buatan (LLM) untuk membantu HR menganalisis performa kerja atau otomatisasi rekrutmen.
6.  **Desain Sistem Tiket Bantuan (`help_support_ticketing_design`):** 
    Alur interaksi tiket helpdesk dari pelaporan kendala oleh karyawan hingga penugasan dan penyelesaian oleh admin.
7.  **Operasional HRMS (`hrms_operations_workflow`):** 
    Bagan alur interaksi terpadu end-to-end data absensi, payroll, reimbursement, dan core data di database.
8.  **Alur Kerja Mobile App (`mobile_app_workflows`):** 
    Panduan transisi halaman Flutter, penyimpanan token aman local, sinkronisasi offline presensi GPS.
9.  **Sistem Notifikasi (`notification_system`):** 
    Logika pemicu pengiriman pesan email prioritas dan push notification asinkron via antrean.
10. **Sistem Keamanan RBAC (`rbac_security`):** 
    Otorisasi pembatasan akses data berjenjang di tingkat tenant penyewa (Superadmin, HR Admin, Manager, Karyawan).
11. **Siklus Langganan & Billing (`registration_subscription_billing`):** 
    Alur pendaftaran perusahaan baru, konfirmasi domain, pembayaran via Midtrans, dan masa percobaan 14 hari.
12. **Alur Kerja Web App (`web_app_workflows`):** 
    Spesifikasi alur perpindahan halaman dashboard Next.js, interaksi API JWT, dan penanganan error.

---

## 📊 Matriks Dokumentasi: Alur Kerja & Fitur

| Nama Berkas | Kategori | Target Pembaca | Topik Utama |
| :--- | :--- | :--- | :--- |
| **[deployment_and_branching.id.md](file:///home/afdhal/data/hr/hrms/docs/workflows_features/deployment_and_branching.id.md)** | DevOps | Developer, DevOps | Git branching model, CI/CD pipeline |
| **[deployment_and_branching.md](file:///home/afdhal/data/hr/hrms/docs/workflows_features/deployment_and_branching.md)** | DevOps | Developer, DevOps | Git branching model, CI/CD pipeline |
| **[employee_lifecycle.id.md](file:///home/afdhal/data/hr/hrms/docs/workflows_features/employee_lifecycle.id.md)** | HR Bisnis | BA, Developer | Siklus kerja karyawan, status kontrak |
| **[employee_lifecycle.md](file:///home/afdhal/data/hr/hrms/docs/workflows_features/employee_lifecycle.md)** | HR Business | BA, Developer | Employee status states, contract lifecycle |
| **[feature_gaps_and_roadmap.id.md](file:///home/afdhal/data/hr/hrms/docs/workflows_features/feature_gaps_and_roadmap.id.md)** | Pelacakan | PM, Product Owner | Kesenjangan fungsional mobile/web |
| **[feature_gaps_and_roadmap.md](file:///home/afdhal/data/hr/hrms/docs/workflows_features/feature_gaps_and_roadmap.md)** | Tracking | PM, Product Owner | Parity gaps between client apps, roadmaps |
| **[feature_map_and_platform_comparison.id.md](file:///home/afdhal/data/hr/hrms/docs/workflows_features/feature_map_and_platform_comparison.id.md)** | Analisis | PM, BA | Perbandingan fitur kompetitor, peta modular |
| **[feature_map_and_platform_comparison.md](file:///home/afdhal/data/hr/hrms/docs/workflows_features/feature_map_and_platform_comparison.md)** | Analysis | PM, BA | Competitor comparisons, modular checklists |
| **[future_support_ai.id.md](file:///home/afdhal/data/hr/hrms/docs/workflows_features/future_support_ai.id.md)** | Rencana | Product Owner, Dev | Integrasi LLM, chatbot HR, rekrutmen AI |
| **[future_support_ai.md](file:///home/afdhal/data/hr/hrms/docs/workflows_features/future_support_ai.md)** | Planning | Product Owner, Dev | LLM integration, HR chatbot, AI recruitment |
| **[help_support_ticketing_design.id.md](file:///home/afdhal/data/hr/hrms/docs/workflows_features/help_support_ticketing_design.id.md)** | Layanan | Support Agent, Dev | Alur tiket kendala, helpdesk workflows |
| **[help_support_ticketing_design.md](file:///home/afdhal/data/hr/hrms/docs/workflows_features/help_support_ticketing_design.md)** | Support | Support Agent, Dev | Support ticket escalations, ticketing workflows |
| **[hrms_operations_workflow.id.md](file:///home/afdhal/data/hr/hrms/docs/workflows_features/hrms_operations_workflow.id.md)** | Diagram | Developer, Architect | Bagan integrasi data HR, presensi, payroll |
| **[hrms_operations_workflow.md](file:///home/afdhal/data/hr/hrms/docs/workflows_features/hrms_operations_workflow.md)** | Diagram | Developer, Architect | Integrated data logs chart, attendance, payroll |
| **[mobile_app_workflows.id.md](file:///home/afdhal/data/hr/hrms/docs/workflows_features/mobile_app_workflows.id.md)** | Mobile | Flutter Developer | Navigasi halaman Flutter, offline cache presensi |
| **[mobile_app_workflows.md](file:///home/afdhal/data/hr/hrms/docs/workflows_features/mobile_app_workflows.md)** | Mobile | Flutter Developer | Flutter screen flows, secure storage, offline geofence |
| **[notification_system.id.md](file:///home/afdhal/data/hr/hrms/docs/workflows_features/notification_system.id.md)** | Utilitas | Developer | Skema kirim asinkron email & push notification |
| **[notification_system.md](file:///home/afdhal/data/hr/hrms/docs/workflows_features/notification_system.md)** | Utility | Developer | Async SMTP triggers, web push notifications |
| **[rbac_security.id.md](file:///home/afdhal/data/hr/hrms/docs/workflows_features/rbac_security.id.md)** | Keamanan | Security, Developer | Otorisasi tenant, role Admin, Manager, Karyawan |
| **[rbac_security.md](file:///home/afdhal/data/hr/hrms/docs/workflows_features/rbac_security.md)** | Security | Security, Developer | Tenant authorization, Admin, Manager roles |
| **[registration_subscription_billing.id.md](file:///home/afdhal/data/hr/hrms/docs/workflows_features/registration_subscription_billing.id.md)** | SaaS Bisnis | DevOps, Finance | Registrasi tenant, trial 14 hari, Midtrans pay |
| **[registration_subscription_billing.md](file:///home/afdhal/data/hr/hrms/docs/workflows_features/registration_subscription_billing.md)** | SaaS Business | DevOps, Finance | Tenant signup, 14-day trials, Midtrans integration |
| **[web_app_workflows.id.md](file:///home/afdhal/data/hr/hrms/docs/workflows_features/web_app_workflows.id.md)** | Web | Next.js Developer | Navigasi Next.js, state auth, interceptor API |
| **[web_app_workflows.md](file:///home/afdhal/data/hr/hrms/docs/workflows_features/web_app_workflows.md)** | Web | Next.js Developer | Next.js visual routing, auth state, API fetch |

---
*Dokumen ini merupakan bagian dari standarisasi dokumentasi platform HariKerja HRMS.*
