# Walkthrough: Implementasi Sistem Notifikasi

Saya telah berhasil merestrukturisasi (refactor) dan mengintegrasikan sistem notifikasi di seluruh platform HRMS.

## 🏗️ Tinjauan Arsitektur

Sistem sekarang dipecah menjadi aplikasi `notifications` khusus dengan `NotificationService` yang terspesialisasi. Layanan ini menangani pemisahan antara peringatan administratif dan operasional.

### Kategori:
- **`ADMIN`**: Peringatan seluruh sistem, pembaruan penagihan, dan peringatan kuota.
- **`OPERATIONAL`**: Peringatan khusus karyawan, perubahan status alur kerja, dan permintaan persetujuan.

---

## 🚀 Pemicu yang Diimplementasikan

### 1. Alur Kerja & Persetujuan
Permintaan seperti **Cuti**, **Lembur**, dan **Reimbursement** sekarang memicu:
- **Peringatan Tertunda**: Dikirim ke manajer saat permintaan mencapai urutan mereka dalam alur kerja.
- **Pembaruan Status**: Dikirim ke karyawan saat permintaan mereka Disetujui (Approved), Ditolak (Rejected), atau Dikembalikan (untuk revisi).

### 2. Penagihan & Langganan
Terintegrasi dengan **Webhook Midtrans**:
- **Pembayaran Berhasil**: Admin menerima peringatan "Sukses" saat langganan atau tambahan kuota dibayar.
- **Pembayaran Gagal**: Admin diberitahu jika transaksi ditolak atau kedaluwarsa.

### 3. Manajemen Kuota
Pemantauan otomatis sumber daya sistem:
- **Kapasitas Karyawan**: Mengirim notifikasi `WARNING` (90%) dan `CRITICAL` (100%) ke Admin.
- **Penggunaan Penyimpanan**: Mengirim notifikasi `WARNING` (90%) dan `CRITICAL` (100%) ke Admin berdasarkan pelacakan penggunaan disk yang mendalam (dokumen, lampiran, foto).

### 4. Manajemen Karyawan
Integrasi untuk peristiwa administratif:
- **Pemutusan Hubungan Kerja/Deaktivasi**: Admin diberitahu ketika akun pengguna secara otomatis dinonaktifkan karena pemutusan hubungan kerja karyawan.

---

## 📂 Isolasi Penyimpanan Tenant

Semua file secara fisik diisolasi ke dalam folder khusus tenant di dalam direktori `media/`.

- **Struktur**: `media/<schema_name>/<category>/<filename>`
- **Bidang yang Tercakup**: Scan KTP, scan NPWP, referensi Wajah, kuitansi Reimbursement, foto Kehadiran, dan lampiran Cuti.
- **Implementasi**: Menggunakan utilitas `tenant_directory_path` di `core.utils` untuk memastikan multi-tenancy pada tingkat sistem file.

---

## 🛠️ Panduan Pengembang

Untuk mengirim jenis notifikasi baru, gunakan `NotificationService`:

```python
from notifications.services import NotificationService
service = NotificationService()

# Untuk peringatan tingkat sistem
service.send_admin_notification(title="Judul", message="Isi", level='INFO')

# Untuk peringatan khusus pengguna
service.send_employee_notification(target_user=user, title="Judul", message="Isi")
```

---
> [!TIP]
> **Pemisahan Perhatian (Separation of Concerns)**: Dengan menggunakan metode khusus seperti `notify_workflow_status_change`, kita menjaga logika bisnis tetap bersih dan memastikan semua notifikasi mengikuti templat terjemahan yang sama.

## ✅ Verifikasi
- **Integritas Kode**: Lolos `python manage.py check`.
- **Database**: Migrasi selesai untuk menambahkan bidang `category` dan mendaftarkan aplikasi baru.
- **Integrasi**: Langganan (`process_subscriptions`), Penagihan (`webhook`), dan Alur Kerja (`core/services.py`) semuanya telah terhubung dengan sukses.
