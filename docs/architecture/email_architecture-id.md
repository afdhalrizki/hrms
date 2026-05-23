# Arsitektur & Pemetaan Email Sistem

Dokumen ini menjelaskan arsitektur komunikasi email pada platform HRMS. Sistem ini mendukung pengiriman notifikasi transaksional, penanganan tiket bantuan (support), serta manajemen penjualan dan penagihan (sales) baik di tingkat global maupun tingkat organisasi (tenant).

---

## 1. Visi Arsitektur Email Masa Depan
Untuk mendukung kebutuhan operasional, sistem ini akan dipetakan ke dalam **3 saluran email utama** berbasis nama domain perusahaan (`@namadomain`):

```mermaid
graph TD
    System[Aplikasi HRMS / Engine] -->|Notifikasi Otomatis| Noreply[noreply@domainname]
    User[Karyawan / Admin Tenant] -->|Bantuan Teknis & Tiket| Support[support@domainname]
    Lead[Calon Tenant / Klien] -->|Pertanyaan & Penagihan| Sales[sales@domainname]

    Noreply -->|Kirim SMTP| TargetUser[Email Penerima]
    Support -->|Integrasi Tiket| Helpdesk[Sistem Helpdesk / Support Module]
    Sales -->|Integrasi Billing| CRM[Modul Billing / Sales CRM]
```

### Rincian Fungsi & Pemetaan 3 Saluran Utama:

| Saluran Email | Arah Aliran | Deskripsi & Kasus Penggunaan | Integrasi Sistem |
| :--- | :--- | :--- | :--- |
| **`noreply@domainname`** | **Keluar (Outgoing / SMTP)** | Email otomatis dari sistem untuk transaksi pengguna. <br>• Pengiriman OTP (One-Time Password)<br>• Slip Gaji digital (Payroll)<br>• Notifikasi persetujuan cuti / klaim<br>• Pengingat absensi. | Dikonfigurasi melalui variabel lingkungan `DEFAULT_FROM_EMAIL` dan layanan SMTP di Django. |
| **`support@domainname`** | **Masuk & Keluar (Bi-directional)** | Penanganan bantuan pelanggan dan tiket teknis.<br>• Pemecahan masalah login / hak akses<br>• Pengaduan bug sistem<br>• Integrasi modul "Help & Support" untuk admin global dan tenant. | Dihubungkan ke modul tiket dukungan internal (`Help & Support`) atau layanan helpdesk eksternal. |
| **`sales@domainname`** | **Masuk & Keluar (Bi-directional)** | Layanan komersial, penjualan, dan penagihan.<br>• Pendaftaran tenant baru (Enterprise)<br>• Pertanyaan harga paket langganan<br>• Faktur dan konfirmasi pembayaran (Billing). | Terintegrasi dengan modul Registrasi Tenant Publik dan Modul `Billing` untuk notifikasi invoice. |

---

## 2. Pemetaan Email pada Berbagai Lingkungan (Environments)
Untuk mendukung siklus pengembangan (*software development lifecycle*), konfigurasi email dipetakan secara dinamis pada berbagai lingkungan di dalam berkas `.env` masing-masing:

| Lingkungan (*Environment*) | Email Autentikasi (`EMAIL_HOST_USER`) | Email Pengirim (`DEFAULT_FROM_EMAIL`) | Keterangan / Status |
| :--- | :--- | :--- | :--- |
| **Lokal / Development** <br>(`.env.local`) | *(Kosong)* | `noreply@{TENANT_DOMAIN_SUFFIX}` <br>*(Fallback ke `noreply@localhost`)* | Digunakan untuk pengembangan lokal. Email biasanya ditangkap menggunakan console backend atau mock mailer (seperti Mailpit). |
| **QA / Testing** <br>(`.env.qa`) | `your-email@gmail.com` | `noreply@harikerja.web.id` | Konfigurasi aktif di lingkungan QA (`harikerja.web.id`) dengan SMTP Gmail sebagai sandbox. |
| **Staging** <br>(`.env.staging_1k`) | `staging-email@domain.com` | `noreply@staging-1k.yourdomain.com` | Digunakan untuk simulasi akhir (*Staging*) sebelum rilis produksi. |
| **Production (Skala Menengah)** <br>(`.env.production_1k`) | `your-email@domain.com` | `noreply@yourdomain.com` | Template konfigurasi produksi untuk skala organisasi standar. |
| **Production (Skala Besar)** <br>(`.env.production_10k`) | `production-email@harikerja.com` | `noreply@harikerja.com` | Konfigurasi aktif pada server produksi utama dengan domain resmi **`harikerja.com`**. |

---

## 3. Akun Email Default (Seeding & Dummy)
Selain email konfigurasi layanan, sistem memiliki kumpulan akun email bawaan (*seeded accounts*) yang digunakan untuk pengujian fungsionalitas multi-tenant dan alur kerja persetujuan (*approval workflows*):

### A. Skema Publik (Global-Admin)
Digunakan untuk mengelola platform secara global dari konsol superadmin:
*   **`superadmin@harikerja.com`**: Akun Super Administrator utama platform (Global Admin).
*   **`admin@pending.com`**: Email simulasi pendaftaran organisasi baru dengan status *PENDING*.
*   **`admin@approved.com`**: Email simulasi pendaftaran organisasi baru dengan status *APPROVED*.

### B. Skema Tenant (Karyawan & Administrator Perusahaan)
Secara dinamis dibuat untuk setiap tenant (misalnya untuk tenant `company1`, `company2`, `worker_0`, dst.) menggunakan sandi bawaan `password123`:
*   **`admin@{tenant}.com`** (Contoh: `admin@company1.com`): Administrator Utama Tenant.
*   **`manager1@{tenant}.com`** (Contoh: `manager1@company1.com`): Manager (Penyetuju alur kerja).
*   **`employee1@{tenant}.com`** s.d. **`employee5@{tenant}.com`**: Karyawan reguler yang memiliki modul absensi, klaim, dan gaji.

---

## 4. Panduan Implementasi & Perubahan Konfigurasi
Ketika domain resmi produksi Anda telah siap (misalnya `perusahaananda.com`), Anda hanya perlu memperbarui variabel lingkungan pada berkas `.env` sebagai berikut:

### Pengaturan Outgoing Email (Notifikasi):
```env
# deploy/environments/.env.production
ENABLE_EMAIL_NOTIFICATIONS=True
EMAIL_HOST=smtp.mailgun.org # Atau layanan SMTP pilihan Anda
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=noreply@perusahaananda.com
EMAIL_HOST_PASSWORD=password-smtp-secure
DEFAULT_FROM_EMAIL=noreply@perusahaananda.com
```

### Pengaturan Incoming Email (Support & Sales):
Integrasi email masuk (`support@` dan `sales@`) biasanya ditangani menggunakan webhook atau email forwarding ke ticketing API:
1.  **Sales**: Alur penagihan akan mengirimkan salinan email dari `sales@perusahaananda.com` saat ada faktur baru atau konfirmasi pembayaran.
2.  **Support**: Email yang masuk ke `support@perusahaananda.com` akan di-forward oleh server email Anda ke API endpoint `/api/support/tickets/` untuk secara otomatis diubah menjadi tiket bantuan dalam sistem HRMS.
