# Matriks Detail Peran & Hak Akses (RBAC) - Web & Mobile

Dokumen ini merupakan panduan referensi utama mengenai hak akses (*Role-Based Access Control* / RBAC) pada platform HRMS. Dokumen ini menguraikan secara spesifik halaman, menu, dan fungsionalitas yang dapat diakses atau dilarang bagi setiap peran (*role*) baik pada aplikasi Web (Frontend Next.js) maupun Aplikasi Mobile (Flutter).

---

## 1. Pembagian Cakupan Peran (Scope Segmentation)

Platform HRMS menggunakan segmentasi ketat berdasarkan arsitektur multi-tenant:
1.  **Global Admin (Skema `public`)**: Mengelola infrastruktur platform SaaS secara keseluruhan, siklus hidup penyewa (tenant), penagihan lintas perusahaan, dan bantuan teknis lintas tenant.
2.  **Tenant User (Skema Penyewa individual)**: Beroperasi sepenuhnya di dalam skema basis data terisolasi milik perusahaan masing-masing. Terbagi menjadi Admin Perusahaan, Manajer HR, dan Staf.

---

## 2. Matriks Peran Global Admin (SaaS Platform Operator)

Pengguna Global Admin hanya beroperasi di bawah skema `public` (melalui domain utama `/login/portal-admin`). Mereka tidak terikat pada satu profil karyawan perusahaan tertentu.

### Tabel Akses Menu & Tindakan - Global Admin

| Peran (Global Role) | Fokus Utama | Halaman Web yang Diakses | Akses Aplikasi Mobile | Tindakan yang Diperbolehkan | Tindakan yang Dilarang |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`SUPERADMIN`** | Manajemen absolut & pengawasan infrastruktur SaaS. | • Dasbor Utama (`/`) <br>• Manajemen Registrasi (`/admin/registrations`) <br>• Manajemen Admin Global (`/admin/global-admins`) | Tidak ditujukan untuk penggunaan operasional mobile (Bypass pemeriksaan jika login). | • Mengelola akun Global Admin lainnya (CRUD).<br>• Menyetujui/menolak registrasi tenant baru.<br>• Melakukan *masquerade* (penyamaran) ke semua tenant klien.<br>• Mengatur billing, invoice, & batas kuota. | Tidak ada batasan sistem. |
| **`ONBOARDING_AGENT`**| Validasi & aktivasi tenant baru. | • Dasbor Utama (`/`) <br>• Manajemen Registrasi (`/admin/registrations`) | Tidak memiliki akses fungsional. | • Melihat daftar registrasi masuk.<br>• Menyetujui atau menolak registrasi tenant baru (memicu otomatisasi PostgreSQL schema sync). | • Mengelola admin global lainnya.<br>• Melakukan *masquerade* ke tenant klien.<br>• Mengakses modul penagihan & keuangan. |
| **`SUPPORT_AGENT`** | Dukungan teknis & pemecahan masalah (*troubleshooting*) klien. | • Dasbor Utama (`/`) <br>• Penyamaran ke workspace tenant klien yang ditugaskan. | Tidak memiliki akses fungsional. | • Melakukan *masquerade* ke tenant perusahaan klien yang **secara spesifik ditugaskan** kepadanya untuk membantu troubleshooting. | • Menyetujui/menolak registrasi tenant.<br>• Mengelola admin global lainnya.<br>• Mengakses menu penagihan.<br>• Masuk ke tenant klien yang tidak ditugaskan. |
| **`BILLING_ADMIN`** | Siklus keuangan, penagihan & kuota langganan platform. | • Dasbor Utama (`/`) <br>• Halaman Manajemen Penagihan (Invoices, Subscription packages) | Tidak memiliki akses fungsional. | • Mengelola paket langganan.<br>• Melihat & memproses invoice penagihan.<br>• Memproses pengajuan pengurangan kuota (`QuotaReductionRequest`). | • Menyetujui/menolak registrasi tenant.<br>• Mengelola admin global lainnya.<br>• Melakukan *masquerade* ke tenant klien. |

---

## 3. Matriks Peran Tenant User (Company Workspace)

Pengguna Tenant beroperasi di dalam workspace perusahaan masing-masing (misal: `perusahaan.harikerja.web.id`). Hak akses mereka dikendalikan oleh flag bawaan Django (`is_staff` untuk Admin) atau melalui penugasan `AccessRole` dinamis yang tersimpan di kolom JSON database.

### Tabel Akses Menu & Tindakan - Tenant User

| Peran (Tenant Role) | Flag / Izin Inti | Halaman Web yang Diakses | Akses Aplikasi Mobile (Menu & Tab) | Tindakan yang Diperbolehkan | Tindakan yang Dilarang |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`ADMIN`** <br>(Tenant Admin) | `is_staff = True` <br>(Bypass otomatis seluruh pemeriksaan RBAC lokal) | **Semua Halaman:**<br>• Dashboard<br>• Profile<br>• Employees<br>• Branches<br>• Attendance<br>• Leaves<br>• Reimbursements<br>• Payroll<br>• Workflows<br>• Analytics<br>• Reports<br>• Settings (Audit Logs, API Keys, Branding) | **Akses Penuh:**<br>• Tab: Home, Schedule, Payslip, Settings.<br>• Quick Access: Leaves, Payslip, Reimbursement, Profile, Documents, Correction, Performance, Reports. | • Mengelola semua data karyawan, departemen, & cabang.<br>• Konfigurasi sistem (Branding, API Keys, Workflows, Audit Logs).<br>• Menyetujui semua jenis cuti, reimbursement, & koreksi kehadiran.<br>• Menjalankan proses & ekspor penggajian (*Payroll*). | • Tidak dapat mengakses data di luar tenant perusahaannya sendiri. |
| **`MANAGER HR`** | Peran dengan izin:<br>`tenant_manage_hr`, `tenant_manage_attendance`, `tenant_manage_payroll`, & semua izin persetujuan (`tenant_approve_*`). | **Sebagian Besar Halaman:**<br>• Dashboard<br>• Profile<br>• Employees<br>• Branches<br>• Attendance<br>• Leaves<br>• Reimbursements<br>• Payroll (Admin mode)<br>• Reports<br>• Analytics (jika diberi akses) | **Akses Manajerial:**<br>• Tab: Home, Schedule, Payslip, Settings.<br>• Quick Access: Leaves, Payslip, Reimbursement, Profile, Documents, Correction, Reports, Performance (jika memiliki `tenant_view_performance_report`). | • Menambah/mengedit data karyawan.<br>• Mengelola kehadiran, shift, & jadwal karyawan.<br>• Memproses pengajuan cuti, reimbursement, & koreksi absensi.<br>• Menjalankan penggajian (Payroll) & mengekspor laporan rekapitulasi. | • Mengubah setelan sistem utama (Branding, API Keys, Workflow config).<br>• Melihat *Audit Logs* sistem (kecuali diberi izin `tenant_view_audit_logs`).<br>• Menghapus peran default sistem (`Admin`, `HR Manager`, `Staff`). |
| **`STAF`** <br>(Standard Employee) | Tidak memiliki izin administratif (Izin kosong/default). | **Akses Mandiri (Self-Service):**<br>• Dashboard (Tanpa statistik global)<br>• Profile (Hanya data pribadi)<br>• Attendance (Hanya clock-in/out)<br>• Leaves (Hanya pengajuan pribadi)<br>• Reimbursements (Hanya pengajuan pribadi)<br>*(Halaman administratif tersembunyi)* | **Akses Terbatas:**<br>• Tab: Home, Schedule, Payslip, Settings.<br>• Quick Access: Leaves, Payslip, Reimbursement, Profile, Documents, Correction.<br>*(Menu Reports & Performance disembunyikan)* | • Melakukan absensi masuk/pulang (*Clock In/Out*) mandiri.<br>• Mengajukan cuti dan reimbursement pribadi.<br>• Mengajukan koreksi absensi pribadi.<br>• Melihat slip gaji bulanan pribadi.<br>• Mengubah sebagian informasi profil mandiri. | • Melihat data karyawan lain (gaji, profil, alamat, dsb.).<br>• Menyetujui permintaan cuti/reimbursement/koreksi orang lain.<br>• Mengakses dasbor analitik & laporan SDM.<br>• Mengakses rute pengaturan/settings. |

---

## 4. Matriks Rute Navigasi Web vs Izin RBAC

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

## 5. Logika Izin pada Aplikasi Mobile (Flutter)

Aplikasi Mobile menyaring fitur yang ditampilkan pada dasbor berdasarkan hak akses yang dikirim dari API melalui metode pembantu `hasPermission` pada model `User`.

### Menu Quick Access di Mobile (`home_screen.dart`):

1.  **Cuti / Leaves (`qa_leaves`)**: **Selalu Terlihat** (Akses Layanan Mandiri untuk semua karyawan).
2.  **Slip Gaji / Payslip (`qa_payslip`)**: **Selalu Terlihat** (Karyawan dapat mengunduh slip gajinya sendiri secara mandiri).
3.  **Klaim / Reimbursement (`qa_reimbursement`)**: **Selalu Terlihat** (Pengajuan reimbursement pribadi).
4.  **Profil Saya / My Profile (`qa_profile`)**: **Selalu Terlihat** (Pembaruan data pribadi mandiri).
5.  **Dokumen / Documents (`qa_documents`)**: **Selalu Terlihat** (Mengakses/mengunggah dokumen pendukung pribadi seperti KTP, NPWP).
6.  **Koreksi Absensi / Correction (`qa_correction`)**: **Selalu Terlihat** (Mengajukan koreksi absensi pribadi).
7.  **Kinerja / Performance (`qa_performance`)**: **Terbatas**. Hanya terlihat jika pengguna memiliki izin `view_performance_report` (dipetakan dari `tenant_view_performance_report`).
8.  **Laporan / Reports (`qa_reports`)**: **Terbatas**. Hanya terlihat jika pengguna memiliki izin `manage_hr` (dipetakan dari `tenant_manage_hr`).

---

## 6. Prinsip Penegakan Keamanan (Security Enforcement)

Sistem menerapkan prinsip *Defense in Depth*, di mana validasi hak akses tidak hanya dilakukan di sisi tampilan (Frontend/Mobile), melainkan wajib diverifikasi di sisi server (Backend Django).

```mermaid
graph TD
    A[Pengguna Melakukan Tindakan / Request API] --> B{Bypass Superuser/Admin?}
    B -->|Ya: is_staff=True / SUPERADMIN| C[Akses Diizinkan]
    B -->|Tidak| D{Memerlukan Izin Spesifik?}
    D -->|Tidak| E{Pemilik Data Sendiri / Self-Service?}
    E -->|Ya| C
    E -->|Tidak| F[HTTP 403 Forbidden]
    D -->|Ya| G{Apakah Kode Izin Ada di JSON AccessRole?}
    G -->|Ya| C
    G -->|Tidak| F
```

### A. Kebijakan Layanan Mandiri (Self-Service Owner Bypass)
Pada viewset backend, bahkan jika karyawan biasa tidak memiliki izin administratif (misal `tenant_manage_hr`), backend tetap meloloskan permintaan (`AllowSelfService`) jika tindakan tersebut memenuhi kondisi kepemilikan data:
*   Melihat profilnya sendiri (`User` / `Employee` yang cocok dengan token aktif).
*   Melihat absensi, slip gaji, cuti, reimbursement, dan riwayat miliknya sendiri.
*   Mengajukan cuti/reimbursement pribadi (membuat data baru yang terikat ke ID karyawannya sendiri).

### B. Atasan Langsung (Direct Supervisor Bypass)
Untuk beberapa alur kerja persetujuan (seperti cuti atau koreksi absensi), backend juga memperbolehkan tindakan persetujuan jika karyawan yang mengajukan adalah bawahan langsung (`Supervisor` dari karyawan tersebut), meskipun atasan tersebut tidak memiliki peran administrasi global `Admin` atau `HR Manager`.
