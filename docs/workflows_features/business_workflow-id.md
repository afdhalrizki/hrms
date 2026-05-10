# Alur Kerja Bisnis & Logika Penagihan

Dokumen ini merinci alur kerja operasional platform **harikerja HRMS**, mulai dari pendaftaran klien hingga onboarding dan mekanisme penagihan.

---

## 🏗️ 1. Alur Pendaftaran & Aktivasi Tenant

Sistem mengikuti alur kerja **B2B SaaS** terpusat untuk memastikan setiap perusahaan (tenant) memiliki database yang terisolasi.

### Tahap 1: Pendaftaran Klien (Layanan Mandiri)
*   **Tindakan**: Calon klien mengisi formulir pendaftaran di halaman utama (Nama Perusahaan, Prefiks Subdomain, Email Admin).
*   **Proses**: API `PublicSignupViewSet` menyimpan data dalam model `RegistrationRequest` dengan status `PENDING`.
*   **Hasil**: Klien menerima konfirmasi email bahwa permintaan sedang ditinjau.

### Tahap 2: Pembayaran Awal (Midtrans)
*   **Tindakan**: Sebelum persetujuan, klien diarahkan untuk membayar biaya langganan pertama berdasarkan paket yang mereka pilih.
*   **Proses**: Integrasi Midtrans Snap menghasilkan token pembayaran. Setelah pembayaran berhasil, status pendaftaran atau faktur terkait diperbarui menjadi `PAID` (DIBAYAR).
*   **Status**: Saat ini, pembayaran diproses sebelum atau selama proses persetujuan oleh Admin Global.

### Tahap 3: Persetujuan & Penyediaan (Provisioning)
*   **Tindakan**: Admin Global meninjau permintaan dan mengklik **Approve** (Setujui).
*   **Proses Otomatis**:
    1.  **Pembuatan Skema**: Database PostgreSQL membuat skema terisolasi baru untuk perusahaan (misal, `pt_maju_bersama`).
    2.  **Pemetaan Domain**: Subdomain (misal, `maju.harikerja.com`) didaftarkan.
    3.  **Penyediaan Pengguna**: Akun pengguna Admin dibuat di skema `public` dan ditautkan ke tenant.
    4.  **Inisialisasi Dasar HR**: Sistem secara otomatis menghasilkan data master dasar (Departemen Manajemen, Peran Admin, Grade Gaji Dasar) di dalam skema tenant agar sistem siap digunakan segera.

### Tahap 4: Onboarding
*   **Tindakan**: Admin perusahaan menerima kredensial login.
*   **Proses**: Admin login ke subdomain perusahaan dan mulai mengundang karyawan melalui fitur **Tambah Karyawan**.

---

## 💰 2. Logika Penagihan & Kuota Karyawan

Platform **harikerja** menggunakan model **Penetapan Harga Berbasis Tingkat** (Bukan Bayar-per-User), di mana harga tetap per paket tetapi dibatasi oleh kuota sumber daya.

### Kuota Karyawan
Setiap paket memiliki batas maksimum karyawan (`max_employees`):
*   **Essential**: Maksimal 50 Karyawan.
*   **Professional**: Maksimal 500 Karyawan.
*   **Premium**: Maksimal 2.000 Karyawan.
*   **Enterprise**: Hingga 10.000+ Karyawan.

### Mekanisme Penegakan Kuota
Sistem memvalidasi jumlah karyawan secara real-time saat Admin mencoba menambahkan karyawan baru:
1.  **Pemeriksaan Jumlah**: Sebelum menyimpan catatan karyawan baru, sistem memanggil `Employee.objects.count()`.
2.  **Perbandingan**: Jika `Jumlah >= max_employees` untuk paket aktif, API mengembalikan kesalahan `QUOTA_EXCEEDED` (HTTP 403).
3.  **Upgrade**: Admin harus meningkatkan paket (melalui Halaman Penagihan) untuk menambah kuota karyawan.

### Kuota Penyimpanan
*   Sistem memantau secara mendalam total ukuran semua file yang diunggah (Reimbursement, foto kehadiran, lampiran cuti, pemindaian KTP/NPWP).
*   **Isolasi**: Semua file diisolasi ke dalam folder fisik khusus tenant (`media/<schema_name>/`) untuk memastikan keamanan dan kejelasan organisasi.
*   **Penegakan**: Jika total penggunaan melebihi `storage_limit_mb`, unggahan file baru diblokir, dan administrator menerima peringatan `CRITICAL` otomatis.

---

## 📈 3. Ringkasan Status Langganan

| Status | Deskripsi | Akses API |
| :--- | :--- | :--- |
| **ACTIVE** | Pembayaran valid & aktif. | Akses Penuh (Baca/Tulis) |
| **EXPIRED** | Melewati tanggal jatuh tempo (Masa Tenggang 14 hari). | **Baca-Saja** (Hanya Lihat Data) |
| **SUSPENDED** | Melewati masa tenggang atau pelanggaran TOS. | **Diblokir** (Akses Ditutup) |

---
> [!TIP]
> Alur kerja ini memastikan skalabilitas platform di mana sumber daya setiap tenant secara otomatis dikontrol oleh sistem penagihan terintegrasi.
