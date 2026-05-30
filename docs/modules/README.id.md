# 🧩 Modul Fungsional Sistem

Folder ini berisi dokumentasi spesifikasi fungsional terperinci untuk seluruh modul inti yang menyusun platform HariKerja HRMS. Setiap dokumen menjelaskan model data, aturan bisnis (*business rules*), alur integrasi API, serta fitur yang didukung di setiap modul.

---

## 🧭 Panduan & Perbedaan Berkas Dokumen

Dokumentasi modul dikelompokkan ke dalam berkas-berkas terpisah, tersedia dalam versi Bahasa Indonesia (`*.id.md`) dan Bahasa Inggris (`*.md`):

1.  **Modul Kehadiran (`attendance`):** 
    Fitur pencatatan presensi, pembatasan lokasi koordinat GPS (geofencing), manajemen shift, pengajuan koreksi presensi, dan pengajuan cuti karyawan.
2.  **Modul Penagihan & Kuota (`billing`):** 
    Manajemen langganan tenant, pemrosesan invoice terintegrasi Midtrans, dan pemantauan kuota data aktif.
3.  **Modul Data Utama (`core`):** 
    Penyimpanan data master dasar seperti struktur organisasi (Cabang, Departemen, Jabatan, Golongan) dan detail profil lengkap karyawan.
4.  **Modul Notifikasi (`notifications`):** 
    Sistem pengiriman pengingat otomatis (lewat Email dan Web Push Notification) saat ada persetujuan cuti, payroll, atau claim expense.
5.  **Modul Penggajian (`payroll`):** 
    Logika penghitungan komponen gaji (Gaji Pokok, Tunjangan, Potongan, BPJS, PPh 21), siklus approval payroll bulanan, hingga generate slip gaji PDF otomatis.
6.  **Modul Kinerja (`performance`):** 
    Pencatatan Key Performance Indicator (KPI) karyawan, penetapan target tahunan, serta pengisian ulasan evaluasi kinerja (appraisals).
7.  **Modul Reimbursement (`reimbursement`):** 
    Sistem pengajuan klaim pengeluaran (reimburse kacamata, kesehatan, transportasi) dengan sistem approval berjenjang.
8.  **Modul Layanan Bantuan (`support`):** 
    Sistem helpdesk tiket internal bagi HR Admin klien untuk meminta bantuan teknis langsung ke Superadmin/Support HariKerja.
9.  **Modul Perusahaan & Domain (`tenants`):** 
    Pengelolaan siklus hidup sub-domain per-perusahaan, isolasi database, dan otorisasi pendaftaran penyewa baru.
10. **Modul Pengguna (`users`):** 
    Manajemen akun kredensial pengguna, autentikasi JWT, hak akses global, dan sinkronisasi role.

---

## 📊 Matriks Dokumentasi: Modul Sistem

| Nama Berkas | Kategori | Target Pembaca | Topik Utama |
| :--- | :--- | :--- | :--- |
| **[attendance.id.md](file:///home/afdhal/data/hr/hrms/docs/modules/attendance.id.md)** | HR Fitur | Developer, Tester | GPS Geofencing, shift kerja, pengajuan cuti |
| **[attendance.md](file:///home/afdhal/data/hr/hrms/docs/modules/attendance.md)** | HR Feature | Developer, Tester | GPS Geofencing, work shifts, leave requests |
| **[billing.id.md](file:///home/afdhal/data/hr/hrms/docs/modules/billing.id.md)** | SaaS Bisnis | DevOps, Finance | Invoice Midtrans, lisensi berlangganan, kuota |
| **[billing.md](file:///home/afdhal/data/hr/hrms/docs/modules/billing.md)** | SaaS Business | DevOps, Finance | Midtrans invoice, subscriptions, quotas |
| **[core.id.md](file:///home/afdhal/data/hr/hrms/docs/modules/core.id.md)** | HR Data | Developer, BA | Struktur organisasi, biodata karyawan, NIK |
| **[core.md](file:///home/afdhal/data/hr/hrms/docs/modules/core.md)** | HR Data | Developer, BA | Org structure, employee biodata, NIK |
| **[notifications.id.md](file:///home/afdhal/data/hr/hrms/docs/modules/notifications.id.md)** | Utilitas | Developer | Email triggers, push notification, SMS |
| **[notifications.md](file:///home/afdhal/data/hr/hrms/docs/modules/notifications.md)** | Utility | Developer | Email triggers, push notification, SMS |
| **[payroll.id.md](file:///home/afdhal/data/hr/hrms/docs/modules/payroll.id.md)** | HR Fitur | Developer, Finance | Slip PDF, komponen PPh21, BPJS, approval gaji |
| **[payroll.md](file:///home/afdhal/data/hr/hrms/docs/modules/payroll.md)** | HR Feature | Developer, Finance | Payslip PDF, tax PPh21, BPJS, payroll approval |
| **[performance.id.md](file:///home/afdhal/data/hr/hrms/docs/modules/performance.id.md)** | HR Fitur | Developer, PM | KPI, target kerja, appraisal, KPI audit |
| **[performance.md](file:///home/afdhal/data/hr/hrms/docs/modules/performance.md)** | HR Feature | Developer, PM | KPI metrics, targets, employee appraisals |
| **[reimbursement.id.md](file:///home/afdhal/data/hr/hrms/docs/modules/reimbursement.id.md)** | HR Fitur | Developer, Finance | Klaim biaya, bukti kuitansi, approval berjenjang |
| **[reimbursement.md](file:///home/afdhal/data/hr/hrms/docs/modules/reimbursement.md)** | HR Feature | Developer, Finance | Expense claims, invoice uploads, approval flow |
| **[support.id.md](file:///home/afdhal/data/hr/hrms/docs/modules/support.id.md)** | Layanan | Support Agent, Dev | Tiket bantuan, helpdesk ticketing, SLA |
| **[support.md](file:///home/afdhal/data/hr/hrms/docs/modules/support.md)** | Support | Support Agent, Dev | Support tickets, customer helpdesk, SLA |
| **[tenants.id.md](file:///home/afdhal/data/hr/hrms/docs/modules/tenants.id.md)** | SaaS Sistem | DevOps, Architect | Isolasi sub-domain, database tenant provisioning |
| **[tenants.md](file:///home/afdhal/data/hr/hrms/docs/modules/tenants.md)** | SaaS System | DevOps, Architect | Sub-domain routing, database tenant provisioning |
| **[users.id.md](file:///home/afdhal/data/hr/hrms/docs/modules/users.id.md)** | Keamanan | Security, Developer | Autentikasi JWT, password hashing, global role |
| **[users.md](file:///home/afdhal/data/hr/hrms/docs/modules/users.md)** | Security | Security, Developer | JWT authentication, hashing, global RBAC |

---
*Dokumen ini merupakan bagian dari standarisasi dokumentasi platform HariKerja HRMS.*
