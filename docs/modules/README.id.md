# 🧩 Modul Fungsional Sistem

Folder ini berisi dokumentasi spesifikasi fungsional terperinci untuk seluruh modul inti yang menyusun platform HariKerja HRMS. Setiap dokumen menjelaskan model data, aturan bisnis (*business rules*), alur integrasi API, serta fitur yang didukung di setiap modul.

---

## 🧭 Panduan & Perbedaan Berkas Dokumen

Dokumentasi modul dikelompokkan ke dalam berkas-berkas terpisah, tersedia dalam versi Bahasa Indonesia (`*.id.md`) dan Bahasa Inggris (`*.md`):

1.  **Modul Kehadiran ([attendance.id.md](./attendance.id.md)):** 
    Fitur pencatatan presensi, pembatasan lokasi koordinat GPS (geofencing), manajemen shift, pengajuan koreksi presensi, dan pengajuan cuti karyawan.
2.  **Modul Penagihan & Kuota ([billing.id.md](./billing.id.md)):** 
    Manajemen langganan tenant, pemrosesan invoice terintegrasi Midtrans, dan pemantauan kuota data aktif.
3.  **Modul Data Utama ([core.id.md](./core.id.md)):** 
    Penyimpanan data master dasar seperti struktur organisasi (Cabang, Departemen, Jabatan, Golongan) dan detail profil lengkap karyawan.
4.  **Modul Notifikasi ([notifications.id.md](./notifications.id.md)):** 
    Sistem pengiriman pengingat otomatis (lewat Email dan Web Push Notification) saat ada persetujuan cuti, payroll, atau claim expense.
5.  **Modul Penggajian ([payroll.id.md](./payroll.id.md)):** 
    Logika penghitungan komponen gaji (Gaji Pokok, Tunjangan, Potongan, BPJS, PPh 21), siklus approval payroll bulanan, hingga generate slip gaji PDF otomatis.
6.  **Modul Kinerja ([performance.id.md](./performance.id.md)):** 
    Pencatatan Key Performance Indicator (KPI) karyawan, penetapan target tahunan, serta pengisian ulasan evaluasi kinerja (appraisals).
7.  **Modul Reimbursement ([reimbursement.id.md](./reimbursement.id.md)):** 
    Sistem pengajuan klaim pengeluaran (reimburse kacamata, kesehatan, transportasi) dengan sistem approval berjenjang.
8.  **Modul Layanan Bantuan ([support.id.md](./support.id.md)):** 
    Sistem helpdesk tiket internal bagi HR Admin klien untuk meminta bantuan teknis langsung ke Superadmin/Support HariKerja.
9.  **Modul Perusahaan & Domain ([tenants.id.md](./tenants.id.md)):** 
    Pengelolaan siklus hidup sub-domain per-perusahaan, isolasi database, dan otorisasi pendaftaran penyewa baru.
10. **Modul Pengguna ([users.id.md](./users.id.md)):** 
    Manajemen akun kredensial pengguna, autentikasi JWT, hak akses global, dan sinkronisasi role.

---

## 📊 Matriks Dokumentasi: Modul Sistem

| Nama Berkas | Kategori | Target Pembaca | Topik Utama |
| :--- | :--- | :--- | :--- |
| **[attendance.id.md](./attendance.id.md)** | HR Fitur | Developer, Tester | GPS Geofencing, shift kerja, pengajuan cuti |
| **[billing.id.md](./billing.id.md)** | SaaS Bisnis | DevOps, Finance | Invoice Midtrans, lisensi berlangganan, kuota |
| **[core.id.md](./core.id.md)** | HR Data | Developer, BA | Struktur organisasi, biodata karyawan, NIK |
| **[notifications.id.md](./notifications.id.md)** | Utilitas | Developer | Email triggers, push notification, SMS |
| **[payroll.id.md](./payroll.id.md)** | HR Fitur | Developer, Finance | Slip PDF, komponen PPh21, BPJS, approval gaji |
| **[performance.id.md](./performance.id.md)** | HR Fitur | Developer, PM | KPI, target kerja, appraisal, KPI audit |
| **[reimbursement.id.md](./reimbursement.id.md)** | HR Fitur | Developer, Finance | Klaim biaya, bukti kuitansi, approval berjenjang |
| **[support.id.md](./support.id.md)** | Layanan | Support Agent, Dev | Tiket bantuan, helpdesk ticketing, SLA |
| **[tenants.id.md](./tenants.id.md)** | SaaS Sistem | DevOps, Architect | Isolasi sub-domain, database tenant provisioning |
| **[users.id.md](./users.id.md)** | Keamanan | Security, Developer | Autentikasi JWT, password hashing, global role |

---
*Dokumen ini merupakan bagian dari standarisasi dokumentasi platform HariKerja HRMS.*
