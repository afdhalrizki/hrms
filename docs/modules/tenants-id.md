# Dokumentasi Modul: Multi-Tenancy & Skema SaaS

## 1. Deskripsi Umum
Modul **Tenants** adalah arsitektur inti yang mewujudkan kapabilitas multi-tenant berbasis perangkat lunak sebagai layanan (*Software as a Service / SaaS*) pada HariKerja HRMS. Modul ini bertanggung jawab membagi akses data secara aman bagi setiap perusahaan pelanggan menggunakan metode isolasi skema basis data (*database schema isolation*). Selain itu, modul ini mengatur perizinan modul berdasarkan tingkat paket langganan, menetapkan kebijakan operasional global per perusahaan, serta menampung permintaan pendaftaran perusahaan baru.

* **Target Pengguna**: Superadmin SaaS dan Administrator Perusahaan (Admin Tenant).

---

## 2. Model Basis Data Utama
Modul ini didukung oleh model-model utama dari Django App `tenants` yang terintegrasi dengan pustaka `django-tenants`:

1. **`Tenant`**: Entitas utama yang mewakili satu perusahaan pelanggan. Mewarisi kelas `TenantMixin`. Menyimpan metadata dasar, konfigurasi personalisasi logo/tema warna, pengaturan kalkulasi penggajian global (divisor lembur, tarif JKK), denda keterlambatan/alpa, level persetujuan operasional, serta masa aktif langganan.
2. **`Domain`**: Menyimpan alamat domain atau subdomain untuk mengakses skema database milik tenant tersebut. Mewarisi kelas `DomainMixin`.
3. **`RegistrationRequest`**: Menampung formulir pendaftaran perusahaan baru yang diajukan oleh calon pelanggan SaaS sebelum diverifikasi dan diaktifkan secara resmi oleh Superadmin.

---

## 3. Fitur Utama & Kegunaan
* **Isolasi Data Tingkat Tinggi**: Setiap tenant memiliki skema database PostgreSQL sendiri (misalnya: `tenant_acme`), mencegah kebocoran data antar-perusahaan secara mutlak.
* **Manajemen Paket Langganan & Fitur**: Enforce ketersediaan modul berdasarkan tingkat paket (`plan_type`):
  * `FREE`: Akses modul dasar Kehadiran (`attendance`). Kuota maksimal 10 karyawan.
  * `ESSENTIAL`: Akses modul dasar + Cuti (`leaves`). Kuota maksimal 25 karyawan.
  * `PROFESSIONAL`: Akses Kehadiran, Cuti, Penggajian (`payroll`), dan Keuangan (`reimbursement`). Kuota maksimal 100 karyawan.
  * `PREMIUM`: Akses semua modul termasuk Penilaian Kinerja (`performance`) dan kustom hak akses (`rbac`). Kuota maksimal 500 karyawan.
  * `ENTERPRISE`: Hak akses penuh tanpa batasan fitur khusus. Kuota maksimal 2000 karyawan.
* **Kebijakan Kehadiran & Penggajian Global**: Memungkinkan admin perusahaan menetapkan denda flat keterlambatan, pembagi lembur bulanan (standar Indonesia: 173), kebijakan platform absensi (Web & Mobile, atau Mobile saja), serta status validasi wajah biometrik.
* **Kebijakan Persetujuan Dokumen**: Opsi penentuan level persetujuan pengajuan (Hanya Atasan / Hanya HR / Keduanya).
* **Manajemen Kuota Karyawan & Storage**: Melacak kapasitas total penyimpanan (MB) dan batas karyawan aktif demi kelangsungan operasi yang adil.

---

## 4. Alur Proses & Flowchart (Mermaid Diagram)

### A. Pendaftaran Tenant Baru & Sinkronisasi Skema Database
```mermaid
graph TD
    A[Mulai: Calon Pelanggan Mengisi Formulir Registrasi] --> B[Data Disimpan di RegistrationRequest Status PENDING]
    B --> C[Superadmin Meninjau Pengajuan di SaaS Portal]
    C -->{Disetujui?}
    C -- Tidak --> D[Ubah Status REJECTED & Kirim Email Penolakan]
    C -- Ya --> E[Ubah Status APPROVED & Generate Tenant Record]
    E --> F[Sistem Otomatis Membuat Skema Database Baru & Sinkronisasi Migrasi Tabel]
    F --> G[Buat Subdomain Domain Record]
    G --> H[Kirim Email Berisi Kredensial Akses & Link Subdomain]
    H --> I[Selesai]
    D --> I
```

### B. Pemantauan Status Langganan & Pembatasan Akses
```mermaid
graph TD
    A[Mulai: Tenant Melakukan Permintaan HTTP] --> B[Middleware Deteksi Subdomain & Muat Profil Tenant]
    B --> C[Sistem Mengevaluasi expiry_date Profil Tenant]
    C -->{Apakah Tanggal Hari Ini <= expiry_date?}
    C -- Ya --> D[Status = ACTIVE: Akses Penuh Baca-Tulis]
    C -- Tidak --> E{Apakah Masuk Masa Tenggang / Grace Period?}
    E -- Ya --> F[Status = EXPIRED: Akses Terbatas READ-ONLY]
    E -- Tidak --> G[Status = SUSPENDED: Akses DIBLOKIR Penuh]
    D --> H[Selesai]
    F --> H
    G --> H
```

---

## 5. Integrasi Antar-Modul
* **Integrasi dengan Modul `users`**: Menghubungkan admin pendaftar pertama ke dalam skema database tenant setelah penciptaan skema selesai, dan membatasi pembentukan admin baru sesuai kuota `max_admins`.
* **Integrasi dengan Modul `billing`**: Faktur pembayaran (`SubscriptionInvoice`) yang lunas akan memperpanjang `expiry_date` dan memperbesar jumlah kuota tambahan karyawan (`extra_employees`) serta kuota penyimpanan tambahan (`extra_storage_mb`).
* **Integrasi dengan Modul `attendance`, `payroll`, `reimbursement`**: Membaca pengaturan level persetujuan global pada profil Tenant (`leave_approval_level`, dll) untuk mengarahkan dokumen persetujuan ke atasan atau HR. Modul payroll juga membaca tarif JKK global tenant di database untuk kalkulasi iuran jaminan kerja.

---

## 6. Hak Akses (RBAC) & Keamanan
* **Isolasi Skema**: Ditegakkan di tingkat framework database oleh middleware `TenantMiddleware`. Pengguna dari skema `tenant_a` tidak dapat melakukan query ke tabel `tenant_b` secara langsung.
* **`tenant_manage_settings`**: Peran administrator tenant yang diperlukan untuk memodifikasi parameter tema warna, logo, konfigurasi perhitungan lembur, denda absen, dan penentuan level persetujuan dokumen.
