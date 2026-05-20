# Dokumentasi Sistem Otorisasi (RBAC) & Klasifikasi Keamanan

Dokumen ini menjelaskan arsitektur otorisasi berbasis peran (**Role-Based Access Control - RBAC**), kebijakan keamanan, pembagian cakupan peran (*scope segmentation*), serta matriks pemetaan rute/izin untuk seluruh platform **HariKerja HRMS** (baik pada tingkat platform SaaS global maupun skema tenant perusahaan).

---

## 🏗️ 1. Otorisasi Tingkat SaaS (Global RBAC - Skema `public`)

Pengguna Global Admin hanya beroperasi di bawah skema `public` (melalui domain utama `/login/portal-admin`) untuk mengelola infrastruktur SaaS secara keseluruhan. Peran global dikonfigurasi menggunakan kolom `global_role` pada model `User`.

### Tabel Akses Menu & Tindakan - Global Admin

| Peran (Global Role) | Fokus Utama | Halaman Web yang Diakses | Akses Aplikasi Mobile | Tindakan yang Diperbolehkan | Tindakan yang Dilarang |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`SUPERADMIN`** | Manajemen absolut & pengawasan infrastruktur SaaS. | • Dasbor Utama (`/`) <br>• Manajemen Registrasi (`/admin/registrations`) <br>• Manajemen Admin Global (`/admin/global-admins`) <br>• Pengaturan Tagihan (`/admin/billing`) | Tidak ditujukan untuk penggunaan operasional mobile. | • Mengelola akun Global Admin lainnya (CRUD).<br>• Menyetujui/menolak registrasi tenant baru.<br>• Melakukan *masquerade* (penyamaran) ke semua tenant klien.<br>• Mengatur billing, invoice, & batas kuota. | Tidak ada batasan sistem. |
| **`ONBOARDING_AGENT`**| Validasi & aktivasi tenant baru. | • Dasbor Utama (`/`) <br>• Manajemen Registrasi (`/admin/registrations`) | Tidak memiliki akses fungsional. | • Melihat daftar registrasi masuk.<br>• Menyetujui atau menolak registrasi tenant baru (memicu otomatisasi PostgreSQL schema sync). | • Mengelola admin global lainnya.<br>• Melakukan *masquerade* ke tenant klien.<br>• Mengakses modul penagihan & keuangan. |
| **`SUPPORT_AGENT`** | Dukungan teknis & pemecahan masalah (*troubleshooting*) klien. | • Dasbor Utama (`/`) <br>• Penyamaran ke workspace tenant klien yang ditugaskan. | Tidak memiliki akses fungsional. | • Melakukan *masquerade* ke tenant perusahaan klien yang **secara spesifik ditugaskan** kepadanya untuk membantu troubleshooting. | • Menyetujui/menolak registrasi tenant.<br>• Mengelola admin global lainnya.<br>• Mengakses menu penagihan.<br>• Masuk ke tenant klien yang tidak ditugaskan. |
| **`BILLING_ADMIN`** | Siklus keuangan, penagihan & kuota langganan platform. | • Dasbor Utama (`/`) <br>• Halaman Manajemen Penagihan (Invoices, Subscription packages) | Tidak memiliki akses fungsional. | • Mengelola paket langganan.<br>• Melihat & memproses invoice penagihan.<br>• Memproses pengajuan pengurangan kuota (`QuotaReductionRequest`). | • Menyetujui/menolak registrasi tenant.<br>• Mengelola admin global lainnya.<br>• Melakukan *masquerade* ke tenant klien. |

---

## 🏢 2. Otorisasi Tingkat Perusahaan (Tenant RBAC - Skema Tenant)

Di dalam skema database tenant individual, hak akses pengguna diatur menggunakan model `AccessRole` dan model `Employee`. Hak akses mereka dikendalikan oleh flag bawaan Django (`is_staff` untuk Admin) atau melalui penugasan `AccessRole` dinamis yang tersimpan di database.

### 2.1 Kumpulan Izin Kanonik (Canonical Permission Pool)
Izin didefinisikan secara granular sebagai bendera boolean dalam model `AccessRole`:
*   `tenant_manage_settings`: Mengubah aturan operasional kantor, hari kerja, toleransi keterlambatan, dan tarif BPJS.
*   `tenant_manage_hr`: Mengelola data karyawan, NIK, penempatan cabang, grade gaji, dan menonaktifkan akun.
*   `tenant_manage_attendance`: Mengelola jadwal shift kantor, rekap log kehadiran, dan menyetujui koreksi absen.
*   `tenant_manage_leaves`: Mengatur kuota cuti tahunan dan memproses persetujuan cuti.
*   `tenant_manage_payroll`: Membuka/mengunci periode penggajian, memproses kalkulasi PPh 21, dan menerbitkan slip gaji.
*   `tenant_view_analytics`: Mengakses dasbor analitik visual performa kehadiran, demografi, dan biaya operasional.

### 2.2 Peran Default Sistem (System Default Roles)
Saat skema database tenant pertama kali di-onboard, sistem membuat peran default yang tidak dapat dihapus (*non-deletable*) oleh admin tenant:

| Peran (Tenant Role) | Flag / Izin Inti | Halaman Web yang Diakses | Akses Aplikasi Mobile (Menu & Tab) | Tindakan yang Diperbolehkan | Tindakan yang Dilarang |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`ADMIN`** <br>(Tenant Admin) | `is_staff = True` <br>(Bypass otomatis seluruh pemeriksaan RBAC lokal) | **Semua Halaman:**<br>• Dashboard<br>• Profile<br>• Employees<br>• Branches<br>• Attendance<br>• Leaves<br>• Reimbursements<br>• Payroll<br>• Workflows<br>• Analytics<br>• Reports<br>• Settings (Audit Logs, API Keys, Branding) | **Akses Penuh:**<br>• Tab: Home, Settings.<br>• Quick Access: Leaves, Payslip, Reimbursement, Profile, Documents, Correction, Performance, Reports. | • Mengelola semua data karyawan, departemen, & cabang.<br>• Konfigurasi sistem (Branding, API Keys, Workflows, Audit Logs).<br>• Menyetujui semua jenis cuti, reimbursement, & koreksi kehadiran.<br>• Menjalankan proses & ekspor penggajian (*Payroll*). | • Tidak dapat mengakses data di luar tenant perusahaannya sendiri. |
| **`MANAGER HR`** | Peran dengan izin:<br>`tenant_manage_hr`, `tenant_manage_attendance`, `tenant_manage_payroll`, & semua izin persetujuan (`tenant_approve_*`). | **Sebagian Besar Halaman:**<br>• Dashboard<br>• Profile<br>• Employees<br>• Branches<br>• Attendance<br>• Leaves<br>• Reimbursements<br>• Payroll (Admin mode)<br>• Reports<br>• Analytics (jika diberi akses) | **Akses Manajerial:**<br>• Tab: Home, Settings.<br>• Quick Access: Leaves, Payslip, Reimbursement, Profile, Documents, Correction, Reports, Performance (jika memiliki `tenant_view_performance_report`). | • Menambah/mengedit data karyawan.<br>• Mengelola kehadiran, shift, & jadwal karyawan.<br>• Memproses pengajuan cuti, reimbursement, & koreksi absensi.<br>• Menjalankan penggajian (Payroll) & mengekspor laporan rekapitulasi. | • Mengubah setelan sistem utama (Branding, API Keys, Workflow config).<br>• Melihat *Audit Logs* sistem (kecuali diberi izin `tenant_view_audit_logs`).<br>• Menghapus peran default sistem (`Admin`, `HR Manager`, `Staff`). |
| **`STAFF`** <br>(Standard Employee) | Tidak memiliki izin administratif (Izin kosong/default). | **Akses Mandiri (Self-Service):**<br>• Dashboard (Tanpa statistik global)<br>• Profile (Hanya data pribadi)<br>• Attendance (Hanya clock-in/out)<br>• Leaves (Hanya pengajuan pribadi)<br>• Reimbursements (Hanya pengajuan pribadi)<br>*(Halaman administratif tersembunyi)* | **Akses Terbatas:**<br>• Tab: Home, Settings.<br>• Quick Access: Leaves, Payslip, Reimbursement, Profile, Documents, Correction.<br>*(Menu Reports & Performance disembunyikan)* | • Melakukan absensi masuk/pulang (*Clock In/Out*) mandiri.<br>• Mengajukan cuti dan reimbursement pribadi.<br>• Mengajukan koreksi absensi pribadi.<br>• Melihat slip gaji bulanan pribadi.<br>• Mengubah sebagian informasi profil mandiri. | • Melihat data karyawan lain (gaji, profil, alamat, dsb.).<br>• Menyetujui permintaan cuti/reimbursement/koreksi orang lain.<br>• Mengakses dasbor analitik & laporan SDM.<br>• Mengakses rute pengaturan/settings. |

---

## 🛡️ 3. Mekanisme Penegakan Keamanan (Security Enforcement)

Sistem menerapkan prinsip *Defense in Depth*, di mana validasi hak akses tidak hanya dilakukan di sisi tampilan (Frontend/Mobile), melainkan wajib diverifikasi di sisi server (Backend Django).

```mermaid
flowchart TD
    Request[Permintaan API Masuk] --> CheckDomain[TenantAccessPermission:\nValidasi domain & Token JWT]
    CheckDomain --> CheckStatus[SubscriptionStatusPermission:\nPeriksa status langganan tenant]
    
    CheckStatus -- SUSPENDED --> BlockAll[Tolak Akses - HTTP 403 Forbidden]
    CheckStatus -- EXPIRED --> CheckSafe{Apakah Metode Aman\nGET / Read-Only?}
    
    CheckSafe -- Tidak --> BlockWrite[Tolak Akses - HTTP 402 Payment Required]
    CheckSafe -- Ya --> CheckRBAC[HasTenantRBACPermission:\nEvaluasi Peran User]
    CheckStatus -- ACTIVE --> CheckRBAC
    
    CheckRBAC --> CheckBypass{Apakah Memenuhi Kasus Bypass?\n1. Self-Service Catatan Sendiri\n2. Atasan Langsung (Direct Supervisor)}
    
    CheckBypass -- Ya --> AllowAPI[Izinkan Request API]
    CheckBypass -- Tidak --> CheckDBPerm{Apakah boolean izin aktif\npada AccessRole user?}
    
    CheckDBPerm -- Ya --> AllowAPI
    CheckDBPerm -- Tidak --> BlockForbidden[Tolak Akses - HTTP 403 Forbidden]

    classDef success fill:#10B981,stroke:#059669,color:#fff;
    classDef fail fill:#EF4444,stroke:#DC2626,color:#fff;
    classDef step fill:#3B82F6,stroke:#2563EB,color:#fff;
    classDef decision fill:#F59E0B,stroke:#D97706,color:#fff;
    
    class AllowAPI success;
    class BlockAll,BlockWrite,BlockForbidden fail;
    class Request,CheckDomain,CheckStatus,CheckRBAC step;
    class CheckSafe,CheckBypass,CheckDBPerm decision;
```

### 3.1 Aturan Pengecualian Bypass Keamanan (Security Bypass Exceptions)

1.  **Bypass Layanan Mandiri (Self-Service Owner Bypass)**:
    Karyawan biasa yang tidak memiliki peran admin tetap diizinkan untuk melihat/mengubah data milik dirinya sendiri.
    *   *Contoh*: Karyawan dapat melihat slip gaji mereka (`GET /api/payslips/`), mengedit foto profil (`PUT /api/users/me/`), dan mengirim permohonan cuti (`POST /api/leave-requests/`). Permintaan ini diloloskan oleh backend jika ID pemilik data cocok dengan `request.user.id`.
2.  **Bypass Atasan Langsung (Direct Supervisor Bypass)**:
    Seorang atasan/supervisor diizinkan menyetujui pengajuan bawahan langsungnya tanpa harus memiliki izin administratif HR global.
    *   *Contoh*: Sinyal validasi memeriksa apakah pengaju cuti memiliki `employee.supervisor_id` yang sama dengan ID pengguna yang sedang menyetujui (`request.user.id`). Jika cocok, aksi disetujui.

---

## 📊 4. Matriks Rute Navigasi Web vs Izin RBAC

Logika rendering menu di `Sidebar.tsx` menyaring visibilitas rute berdasarkan izin pengguna dari API. Jika pengguna tidak memiliki izin yang diperlukan, menu akan disembunyikan dari sidebar.

| Rute Frontend Next.js | Deskripsi Halaman | Kunci Izin Backend yang Dibutuhkan | Penjaga Keamanan Frontend (Sidebar Guard) |
| :--- | :--- | :--- | :--- |
| `/` | Ringkasan dasbor operasional & statistik. | N/A (Dasbor menyesuaikan isi data berdasarkan hak akses pengguna) | Terbuka untuk semua pengguna terautentikasi. |
| `/profile` | Informasi profil pribadi pengguna/karyawan. | N/A (Akses Mandiri) | Terbuka untuk semua, disembunyikan di Public Tenant. |
| `/employees` | CRUD data Karyawan, Departemen, & Peran. | `tenant_manage_hr` | `requiredPermission: 'tenant_manage_hr'` |
| `/branches` | Manajemen lokasi cabang & koordinat GPS absensi. | `tenant_manage_hr` | `requiredPermission: 'tenant_manage_hr'` |
| `/attendance` | Pengaturan shift, jadwal kerja global, & riwayat absensi. | `tenant_manage_attendance` (untuk manajemen); Layanan Mandiri (untuk clock-in/out) | Terbuka untuk Staf (akses absensi mandiri). Tab Persetujuan memerlukan `tenant_approve_attendance_correction`. |
| `/leaves` | Pengajuan cuti & persetujuan cuti karyawan. | `tenant_approve_leave` (untuk persetujuan); Layanan Mandiri (untuk pengajuan pribadi) | Terbuka untuk Staf. Tab Persetujuan disembunyikan jika tidak memiliki izin persetujuan cuti. |
| `/reimbursements` | Klaim biaya & persetujuan reimbursement. | `tenant_approve_reimbursement` (untuk persetujuan); Layanan Mandiri (untuk pengajuan pribadi) | Terbuka untuk Staf. Tab Persetujuan disembunyikan jika tidak memiliki izin persetujuan reimbursement. |
| `/payroll` | Pembuatan slip gaji bulanan, ekspor rekap, & kelola gaji. | `tenant_manage_payroll` (untuk kelola); `tenant_view_all_payslips` (untuk melihat semua) | `requiredPermission: 'tenant_manage_payroll'` (Staf hanya bisa melihat slip miliknya via menu pop-up/profil). |
| `/workflows` | Konfigurasi alur kerja persetujuan berjenjang. | `tenant_manage_settings` | `requiredPermission: 'tenant_manage_settings'` |
| `/analytics` | Dasbor visual & statistik grafik kehadiran. | `tenant_manage_hr` | `requiredPermission: 'tenant_manage_hr'` |
| `/reports` | Laporan data operasional SDM historis. | `tenant_manage_hr` | `requiredPermission: 'tenant_manage_hr'` |
| `/settings` | Pengaturan umum tenant & penambahan modul. | `tenant_manage_settings` | `requiredPermission: 'tenant_manage_settings'` |
| `/settings/audit-logs` | Rekam jejak aktivitas sistem (*Audit Trails*). | `tenant_view_audit_logs` | `requiredPermission: 'tenant_view_audit_logs'` |
| `/settings/api-keys` | Pengelolaan kunci API pihak ketiga. | `tenant_manage_settings` | `requiredPermission: 'tenant_manage_settings'` |
| `/settings/branding` | Kustomisasi logo & tema warna perusahaan. | `tenant_manage_settings` | `requiredPermission: 'tenant_manage_settings'` |

---

## 📱 5. Otorisasi Aplikasi Mobile (Flutter)

Aplikasi mobile ESS Flutter mematuhi aturan RBAC backend dengan menyesuaikan render antarmuka pengguna:
*   **Module Visibility**: Dasbor mobile mengambil daftar modul aktif (`enabledModules`) dari `TenantContext` saat inisialisasi awal. Jika modul `payroll` tidak aktif pada paket langganan penyewa, menu **Gaji & Slip** disembunyikan dan dinonaktifkan di tingkat visual.
*   **Fungsi Khusus Supervisor**: Menu **Persetujuan Tim** hanya dirender jika profil karyawan terdaftar memiliki flag parameter `is_supervisor = True` (mempunyai minimal 1 bawahan aktif di sistem).

### Menu Quick Access di Mobile (`home_screen.dart`):

1.  **Cuti / Leaves (`qa_leaves`)**: **Selalu Terlihat** (Akses Layanan Mandiri untuk semua karyawan).
2.  **Slip Gaji / Payslip (`qa_payslip`)**: **Selalu Terlihat** (Karyawan dapat mengunduh slip gajinya sendiri secara mandiri).
3.  **Klaim / Reimbursement (`qa_reimbursement`)**: **Selalu Terlihat** (Pengajuan reimbursement pribadi).
4.  **Profil Saya / My Profile (`qa_profile`)**: **Selalu Terlihat** (Pembaruan data pribadi mandiri).
5.  **Dokumen / Documents (`qa_documents`)**: **Selalu Terlihat** (Mengakses/mengunggah dokumen pendukung pribadi seperti KTP, NPWP).
6.  **Koreksi Absensi / Correction (`qa_correction`)**: **Selalu Terlihat** (Mengajukan koreksi absensi pribadi).
7.  **Kinerja / Performance (`qa_performance`)**: **Terbatas**. Hanya terlihat jika pengguna memiliki izin `view_performance_report` (dipetakan dari `tenant_view_performance_report`).
8.  **Laporan / Reports (`qa_reports`)**: **Terbatas**. Hanya terlihat jika pengguna memiliki izin `manage_hr` (dipetakan dari `tenant_manage_hr`).
