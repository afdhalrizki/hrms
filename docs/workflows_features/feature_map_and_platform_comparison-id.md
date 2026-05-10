# Pemetaan Fitur dan Perbandingan Platform

Dokumen ini memberikan tinjauan komprehensif tentang fitur-fitur HRMS dan ketersediaannya di platform Web (Frontend) dan Mobile (Flutter).

## 1. Tinjauan Fitur Global

Platform HRMS dibagi menjadi beberapa modul inti:

- **Core/HR**: Data karyawan, dokumen, struktur organisasi.
- **Attendance**: Pelacakan waktu nyata, geolokasi, cuti, lembur, dan koreksi.
- **Payroll**: Perhitungan otomatis, pemrosesan pajak, dan distribusi slip gaji.
- **Performance**: Pelacakan KPI, penilaian mandiri, dan tinjauan manajemen.
- **SaaS Admin**: Registrasi tenant, manajemen langganan, dan audit sistem.

---

## 2. Matriks Perbandingan Platform

| Modul | Fitur | Web (Admin/Staff) | Web (Karyawan) | Mobile (Karyawan) | Plan Min. |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Auth** | Login / Logout | ✅ | ✅ | ✅ | FREE |
| | Registrasi (SaaS) | ✅ | ❌ | ❌ | FREE |
| | Update Profil | ✅ | ✅ | ✅ | FREE |
| **HR** | Manajemen Karyawan (CRUD) | ✅ | ❌ | ❌ | FREE |
| | Manajemen Dokumen | ✅ | ✅ | ✅ (Upload) | FREE |
| | Struktur Org / Cabang | ✅ | ✅ | ❌ | ESSENTIAL |
| **Attendance** | Absensi (GPS) | ✅ | ✅ | ✅ (Utama) | FREE |
| | Pengajuan Cuti | ✅ | ✅ | ✅ | ESSENTIAL |
| | Persetujuan Cuti | ✅ | ❌ | ❌ | ESSENTIAL |
| | Pengajuan Lembur | ✅ | ✅ | ✅ | ESSENTIAL |
| | Koreksi Absensi | ✅ | ✅ | ✅ | PREMIUM |
| **Payroll** | Proses Payroll | ✅ | ❌ | ❌ | PROFESSIONAL |
| | Lihat/Unduh Slip Gaji | ✅ | ✅ | ✅ | PROFESSIONAL |
| **Performance** | Setup KPI | ✅ | ❌ | ❌ | PREMIUM |
| | Penilaian Mandiri | ✅ | ✅ | ✅ | PREMIUM |
| | Review Manajer | ✅ | ❌ | ❌ | PREMIUM |
| **Analytics** | Ringkasan Dashboard | ✅ | ✅ | ✅ | FREE |
| | Ekspor Detail (XLSX/PDF) | ✅ | ✅ | ✅ (Terbatas) | ESSENTIAL |
| | Audit Log Sistem | ✅ | ❌ | ❌ | ENTERPRISE |

---

## 3. Pemetaan Halaman & Layar

### Rute Web (Frontend)
| Rute | Visibilitas | Perlu Login |
| :--- | :--- | :---: |
| `/login` | Publik | ❌ |
| `/signup` | Publik | ❌ |
| `/registration` | Publik | ❌ |
| `/profile` | Terproteksi | ✅ |
| `/employees` | Terproteksi (Admin) | ✅ |
| `/attendance` | Terproteksi | ✅ |
| `/leaves` | Terproteksi | ✅ |
| `/payroll` | Terproteksi | ✅ |
| `/analytics` | Terproteksi (Admin) | ✅ |
| `/settings` | Terproteksi (Admin) | ✅ |

### Layar Mobile (Flutter)
| Nama Layar | Tujuan | Perlu Login |
| :--- | :--- | :---: |
| `LoginScreen` | Autentikasi | ❌ |
| `HomeScreen` | Dashboard & Aksi Cepat | ✅ |
| `AttendanceScreen` | Absensi (Peta) | ✅ |
| `LeaveListScreen` | Riwayat & Status | ✅ |
| `LeaveApplyScreen` | Ajukan cuti baru | ✅ |
| `PayslipScreen` | Daftar & Lihat Slip Gaji| ✅ |
| `PerformanceScreen` | KPI & Review Mandiri | ✅ |
| `ProfileEditScreen` | Data Pribadi & Dokumen | ✅ |

---

## 4. Matriks API & Otorisasi

Semua endpoint yang terproteksi memerlukan header `Authorization: Bearer <token>` dan konteks `X-Tenant`.

| Endpoint | Metode | Platform | Izin yang Diperlukan | Login |
| :--- | :--- | :--- | :--- | :---: |
| `/auth/login/` | `POST` | Semua | `AllowAny` | ❌ |
| `/public/signup/` | `POST` | Web | `AllowAny` | ❌ |
| `/users/me/` | `GET` | Semua | `IsAuthenticated` | ✅ |
| `/employees/` | `GET` | Web | `manage_employees` | ✅ |
| `/employees/` | `POST` | Web | `manage_employees` | ✅ |
| `/employees/{id}/` | `PATCH` | Semua | `IsAuthenticated` (Diri sendiri/Admin) | ✅ |
| `/attendance/` | `GET` | Semua | `IsAuthenticated` (Diri sendiri) | ✅ |
| `/attendance/` | `POST` | Semua | `IsAuthenticated` (Diri sendiri) | ✅ |
| `/leave-requests/` | `POST` | Semua | `IsAuthenticated` (Diri sendiri) | ✅ |
| `/leave-requests/{id}/`| `PATCH` | Web | `manage_leaves` | ✅ |
| `/payslips/` | `GET` | Semua | `IsAuthenticated` (Diri sendiri) | ✅ |
| `/payslips/{id}/pdf/` | `GET` | Semua | `IsAuthenticated` (Diri sendiri) | ✅ |
| `/core/dashboard-stats/`| `GET` | Semua | `view_analytics` | ✅ | PROFESSIONAL |
| `/tenant/settings/` | `PATCH` | Web | `manage_tenant_settings` | ✅ | ESSENTIAL |

---

## 5. Pembatasan Berdasarkan Paket Langganan

Sistem memberlakukan akses ke fitur berdasarkan paket langganan aktif milik tenant.

| Paket | Modul yang Termasuk | Target Pengguna |
| :--- | :--- | :--- |
| **FREE** | Core, Absensi Dasar | Startup & UMKM Mikro |
| **ESSENTIAL** | Core, Absensi (Geo), Cuti | Bisnis Kecil |
| **PROFESSIONAL** | + Payroll (PPh 21/BPJS), Reimbursement | Bisnis Berkembang |
| **PREMIUM** | + Performance (KPI), RBAC Lanjutan | Perusahaan High-Growth |
| **ENTERPRISE** | + Analytics, Audit Trail, Custom SLA | Perusahaan Besar/Enterprise |

---

## 6. Ringkasan Batasan Platform

1.  **Mobile untuk Karyawan**: Aplikasi mobile dirancang ramping untuk tugas operasional harian. Ini tidak mencakup fitur manajemen (menyetujui cuti orang lain, memproses payroll, atau konfigurasi sistem).
2.  **Web untuk Admin & Mandiri**: Portal web adalah antarmuka fitur lengkap. Ini melayani administrator (Manajer HR, Pemilik) dan karyawan yang lebih memilih tampilan desktop.
3.  **Akses Publik**: Hanya landing page, harga, dan portal pendaftaran/login yang dapat diakses tanpa akun. Setelah tenant diidentifikasi, sistem memberlakukan isolasi ketat.
