# Pemetaan Notifikasi Email

Dokumen ini menjelaskan daftar notifikasi email otomatis yang dikirim oleh sistem **HariKerja HRMS**, termasuk pemicu (trigger), penerima, dan tujuannya.

## Konfigurasi
Semua notifikasi email dikirim secara asinkron melalui **Celery**. Email hanya akan dikirim jika:
1. `ENABLE_EMAIL_NOTIFICATIONS` diatur ke `True` dalam pengaturan sistem.
2. Penerima memiliki alamat email yang valid.
3. Penerima telah mengaktifkan "Notifikasi Email" di profil pengguna mereka (untuk email operasional).

**Identitas Pengirim:**
- **Nama Pengirim:** `HariKerja HRMS`
- **Email Pengirim:** `noreply@harikerja.com` (atau domain yang dikonfigurasi)
- **Tanda Tangan:** `Terima kasih, HariKerja HRMS`

---

## 1. Email Tenant & Registrasi
Dikelola di `backend/tenants/tasks.py`.

| Pemicu (Trigger) | Penerima | Subjek | Deskripsi |
| :--- | :--- | :--- | :--- |
| **Registrasi Baru** | Admin Tenant | `Registration Received` | Mengonfirmasi bahwa pendaftaran telah diterima dan sedang ditinjau. |
| **Registrasi Disetujui** | Admin Tenant | `Welcome to HRMS` | Dikirim saat superadmin menyetujui tenant. Berisi URL workspace dan kredensial login awal. |
| **Onboarding Karyawan Baru** | Karyawan Baru | `Selamat Datang di HariKerja HRMS` | Dikirim saat HR mendaftarkan karyawan baru. Berisi instruksi login dan link workspace. |


## 2. Email Workflow & Operasional
Dikelola melalui `NotificationService` di `backend/notifications/services.py`.

| Pemicu (Trigger) | Penerima | Subjek | Deskripsi |
| :--- | :--- | :--- | :--- |
| **Pengajuan Baru** | Approver (Manager/HR) | `Persetujuan Diperlukan` | Memberitahu orang berikutnya dalam alur kerja bahwa ada pengajuan (Cuti, Reimbursement, dll) yang memerlukan tindakan. |
| **Pengajuan Disetujui/Ditolak** | Pemohon (Karyawan) | `Status Pengajuan: [Status]` | Memberitahu karyawan tentang keputusan akhir atas pengajuan mereka. |
| **Slip Gaji Terbit** | Karyawan | `Slip Gaji Terbit` | Memberitahu karyawan bahwa slip gaji mereka untuk periode tersebut sudah tersedia di sistem. |

## 3. Email Billing & Sistem
Dikelola melalui `NotificationService` di `backend/notifications/services.py`.

| Pemicu (Trigger) | Penerima | Subjek | Deskripsi |
| :--- | :--- | :--- | :--- |
| **Status Pembayaran** | Admin Tenant | `Pembayaran Berhasil/Gagal` | Memberitahu admin tentang status pembayaran langganan mereka melalui Midtrans. |
| **Batas Kuota Karyawan** | Admin Tenant | `Peringatan Kuota Karyawan` | Dikirim saat jumlah karyawan mencapai persentase tertentu dari batas langganan. |
| **Batas Penyimpanan** | Admin Tenant | `Peringatan Penyimpanan` | Dikirim saat penggunaan ruang penyimpanan mencapai persentase tinggi dari batas yang dialokasikan. |

---

## Implementasi Teknis
- **Base Service**: `NotificationService` menangani logika pembuatan record in-app dan memicu task email.
- **Task Queue**: `send_notification_email_task` di `backend/notifications/tasks.py` menangani pengiriman SMTP yang sebenarnya.
- **Branding**: Tanda tangan dan nama pengirim distandarisasi di semua task untuk menjaga identitas brand **HariKerja HRMS**.
