# 🔄 Alur Kerja Sistem & Diagram Fungsional

Folder ini berisi dokumentasi komprehensif mengenai alur kerja bisnis (*business workflows*), proses operasional platform, diagram interaksi fungsional, arsitektur percabangan git (*branching strategy*), serta peta jalan fitur pada platform HariKerja HRMS.

---

## 🧭 Panduan & Perbedaan Berkas Dokumen

Dokumentasi alur kerja dikelompokkan ke dalam beberapa topik utama yang tersedia dalam versi Bahasa Indonesia (`*.id.md`) dan Bahasa Inggris (`*.md`):

1.  **Deployment & Percabangan ([deployment_and_branching.id.md](./deployment_and_branching.id.md)):** 
    Strategi branching Git (Main, Develop, Feature branch) dan alur CI/CD dari lokal hingga produksi.
2.  **Integrasi Pembayaran Gaji Langsung ([direct_payroll_payout.id.md](./direct_payroll_payout.id.md)):** 
    Desain teknis dan rencana implementasi transfer gaji langsung ke rekening karyawan menggunakan Payment Gateway B2B (Xendit/Midtrans).
3.  **Siklus Hidup Karyawan ([employee_lifecycle.id.md](./employee_lifecycle.id.md)):** 
    Tahapan status karyawan dari mulai pendaftaran (Onboarding), evaluasi probation, aktif bekerja, mutasi, hingga resign/pensiun.
4.  **Kesenjangan Fitur & Roadmap ([feature_gaps_and_roadmap.id.md](./feature_gaps_and_roadmap.id.md)):** 
    Analisis kesenjangan modul yang belum diimplementasikan di mobile/web serta peta jalan penyelesaiannya.
5.  **Peta Fitur & Perbandingan Platform ([feature_map_and_platform_comparison.id.md](./feature_map_and_platform_comparison.id.md)):** 
    Perbandingan kesetaraan fungsionalitas antara web client, mobile client, serta aplikasi HR kompetitor.
6.  **Masa Depan Fitur AI ([future_support_ai.id.md](./future_support_ai.id.md)):** 
    Konseptual rencana integrasi kecerdasan buatan (LLM) untuk membantu HR menganalisis performa kerja atau otomatisasi rekrutmen.
7.  **Desain Sistem Tiket Bantuan ([help_support_ticketing_design.id.md](./help_support_ticketing_design.id.md)):** 
    Alur interaksi tiket helpdesk dari pelaporan kendala oleh karyawan hingga penugasan dan penyelesaian oleh admin.
8.  **Operasional HRMS ([hrms_operations_workflow.id.md](./hrms_operations_workflow.id.md)):** 
    Bagan alur interaksi terpadu end-to-end data absensi, payroll, reimbursement, dan core data di database.
9.  **Alur Kerja Mobile App ([mobile_app_workflows.id.md](./mobile_app_workflows.id.md)):** 
    Panduan transisi halaman Flutter, penyimpanan token aman local, sinkronisasi offline presensi GPS.
10. **Sistem Notifikasi ([notification_system.id.md](./notification_system.id.md)):** 
    Logika pemicu pengiriman pesan email prioritas dan push notification asinkron via antrean.
11. **Sistem Keamanan RBAC ([rbac_security.id.md](./rbac_security.id.md)):** 
    Otorisasi pembatasan akses data berjenjang di tingkat tenant penyewa (Superadmin, HR Admin, Manager, Karyawan).
12. **Siklus Langganan & Billing ([registration_subscription_billing.id.md](./registration_subscription_billing.id.md)):** 
    Alur pendaftaran perusahaan baru, konfirmasi domain, pembayaran via Midtrans, dan masa percobaan 14 hari.
13. **Alur Kerja Web App ([web_app_workflows.id.md](./web_app_workflows.id.md)):** 
    Spesifikasi alur perpindahan halaman dashboard Next.js, interaksi API JWT, dan penanganan error.

---

## 📊 Matriks Dokumentasi: Alur Kerja & Fitur

| Nama Berkas | Kategori | Target Pembaca | Topik Utama |
| :--- | :--- | :--- | :--- |
| **[deployment_and_branching.id.md](./deployment_and_branching.id.md)** | DevOps | Developer, DevOps | Git branching model, CI/CD pipeline |
| **[direct_payroll_payout.id.md](./direct_payroll_payout.id.md)** | Integrasi | Keuangan, Developer | Pembayaran gaji langsung via B2B gateway, transfer bank |
| **[employee_lifecycle.id.md](./employee_lifecycle.id.md)** | HR Bisnis | BA, Developer | Siklus kerja karyawan, status kontrak |
| **[feature_gaps_and_roadmap.id.md](./feature_gaps_and_roadmap.id.md)** | Pelacakan | PM, Product Owner | Kesenjangan fungsional mobile/web |
| **[feature_map_and_platform_comparison.id.md](./feature_map_and_platform_comparison.id.md)** | Analisis | PM, BA | Perbandingan fitur kompetitor, peta modular |
| **[future_support_ai.id.md](./future_support_ai.id.md)** | Rencana | Product Owner, Dev | Integrasi LLM, chatbot HR, rekrutmen AI |
| **[help_support_ticketing_design.id.md](./help_support_ticketing_design.id.md)** | Layanan | Support Agent, Dev | Alur tiket kendala, helpdesk workflows |
| **[hrms_operations_workflow.id.md](./hrms_operations_workflow.id.md)** | Diagram | Developer, Architect | Bagan integrasi data HR, presensi, payroll |
| **[mobile_app_workflows.id.md](./mobile_app_workflows.id.md)** | Mobile | Flutter Developer | Navigasi halaman Flutter, offline cache presensi |
| **[notification_system.id.md](./notification_system.id.md)** | Utilitas | Developer | Skema kirim asinkron email & push notification |
| **[rbac_security.id.md](./rbac_security.id.md)** | Keamanan | Security, Developer | Otorisasi tenant, role Admin, Manager, Karyawan |
| **[registration_subscription_billing.id.md](./registration_subscription_billing.id.md)** | SaaS Bisnis | DevOps, Finance | Registrasi tenant, trial 14 hari, Midtrans pay |
| **[web_app_workflows.id.md](./web_app_workflows.id.md)** | Web | Next.js Developer | Navigasi Next.js, state auth, interceptor API |

---
*Dokumen ini merupakan bagian dari standarisasi dokumentasi platform HariKerja HRMS.*
