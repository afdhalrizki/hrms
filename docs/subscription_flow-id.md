# Alur Langganan & Siklus Hidup Trial Tenant

Dokumen ini menjelaskan alur kerja teknis untuk pendaftaran tenant baru, penyediaan uji coba (trial) otomatis, dan pembatasan akses berbasis langganan.

## 1. Alur Kerja Pendaftaran (Signup)
1. **Signup Publik**: Calon tenant mengisi formulir pendaftaran di domain publik (`/signup`).
   - Data yang dikumpulkan: Nama Perusahaan, Subdomain yang Diinginkan, dan Email Admin.
2. **Status Menunggu (Pending)**: Permintaan disimpan sebagai `RegistrationRequest` dengan status `PENDING`.
3. **Persetujuan**: Super Admin meninjau dan menyetujui pendaftaran melalui portal manajemen internal.

## 2. Aktivasi Otomatis & Periode Uji Coba
Ketika pendaftaran disetujui, sistem secara otomatis melakukan hal berikut:
- **Pembuatan Tenant**: Tenant baru dibuat dengan `plan_type='FREE'`.
- **Pengaturan Kedaluwarsa Otomatis**: `expiry_date` secara otomatis diatur ke **14 hari** dari tanggal persetujuan.
- **Penyediaan Infrastruktur**: Skema PostgreSQL dibuat, data master HR diinisialisasi, dan akun Admin Tenant disediakan.

## 3. Pembatasan Akses Langganan
Sistem memantau `expiry_date` melalui middleware dan memberlakukan pembatasan bertingkat berdasarkan status langganan:

### A. Fase Aktif (Hari ke-1 hingga Hari ke-14)
- **Status**: `ACTIVE`
- **Akses**: Akses Penuh (Baca & Tulis).
- **Perilaku**: Pengguna dapat melakukan semua operasi dalam fitur paket mereka.

### B. Masa Tenggang (Hari ke-15 hingga Hari ke-28)
- **Status**: `EXPIRED`
- **Akses**: **Mode Baca-Saja (Read-Only)**.
  - Pengguna dapat melihat data (permintaan GET).
  - Pengguna **diblokir** dari membuat, memperbarui, atau menghapus data (POST, PUT, PATCH, DELETE).
- **Respons Kesalahan**: `402 Payment Required` dengan kode `SUBSCRIPTION_EXPIRED_READ_ONLY`.
- **Tujuan**: Memungkinkan tenant untuk terus memantau data sambil memproses pembayaran perpanjangan mereka.

### C. Fase Penangguhan (Hari ke-29 dan seterusnya)
- **Status**: `SUSPENDED`
- **Akses**: **Blokir Total**.
  - Semua API fungsional diblokir (`402 Payment Required`).
  - Hanya endpoint **Billing** (Penagihan) dan **Logout** yang tetap dapat diakses.
- **Respons Kesalahan**: `402 Payment Required` with code `SUBSCRIPTION_SUSPENDED`.

## 4. Perpanjangan & Upgrade
Setelah pembayaran berhasil diproses melalui Midtrans:
1. `plan_type` diperbarui (misalnya, menjadi Essential, Professional, atau Premium).
2. `expiry_date` diperpanjang berdasarkan pembelian (misalnya, +30 hari atau +365 hari).
3. Status kembali ke `ACTIVE`, memulihkan akses tulis penuh segera.
