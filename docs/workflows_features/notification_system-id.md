# Dokumentasi Arsitektur Notifikasi & Pemetaan Notifikasi (In-App & Email)

Dokumen ini menjelaskan arsitektur terintegrasi, konfigurasi, dan pemetaan lengkap untuk sistem notifikasi (baik notifikasi dalam aplikasi/in-app maupun email otomatis) pada platform **HariKerja HRMS**.

---

## 🏗️ 1. Tinjauan Arsitektur Notifikasi

Sistem notifikasi diimplementasikan dalam modul khusus `backend/notifications/` menggunakan kelas pembungkus `NotificationService`. Pembungkus ini mengabstraksi pengiriman notifikasi ke berbagai saluran (*delivery channels*) secara efisien dan asinkron menggunakan **Celery** dan **Redis** sebagai antrean pesan.

```mermaid
flowchart TD
    Trigger[Pemicu Peristiwa / Event Trigger\n- Sinyal Model / views.py] --> ServiceCall[Panggil NotificationService]
    
    ServiceCall --> CheckCategory{Kategori Notifikasi?}
    
    CheckCategory -- ADMIN --> RouteAdmin[Notifikasi Admin:\n- Peringatan Kuota\n- Status Pembayaran\n- Registrasi Klien]
    CheckCategory -- OPERATIONAL --> RouteOper[Notifikasi Operasional:\n- Workflow Cuti & Reimburse\n- Penerbitan Slip Gaji\n- Log Absensi]
    
    RouteAdmin --> WriteDB[Simpan ke DB: public.SystemNotification]
    RouteOper --> WriteDBTenant[Simpan ke DB: [tenant].SystemNotification]
    
    WriteDB --> CheckEmail{Apakah Email Aktif?}
    WriteDBTenant --> CheckEmail
    
    CheckEmail -- Ya --> QueueCelery[Picu Task: send_notification_email_task]
    CheckEmail -- Tidak --> InAppOnly[Tampilkan Hanya di Bell Lonceng Web/Mobile]
    
    QueueCelery --> RedisQueue[Redis Broker Queue]
    RedisQueue --> CeleryWorker[Celery Worker Asynchronous]
    CeleryWorker --> SMTPServer[Kirim via SMTP Server]
    SMTPServer --> ClientInbox[Kotak Masuk Email Pengguna]

    classDef success fill:#10B981,stroke:#059669,color:#fff;
    classDef step fill:#3B82F6,stroke:#2563EB,color:#fff;
    classDef decision fill:#F59E0B,stroke:#D97706,color:#fff;
    
    class ClientInbox success;
    class Trigger,ServiceCall,RouteAdmin,RouteOper,WriteDB,WriteDBTenant,QueueCelery,InAppOnly,RedisQueue,CeleryWorker,SMTPServer step;
    class CheckCategory,CheckEmail decision;
```

### Kategori Utama Notifikasi:
1.  **`ADMIN`**: Ditujukan bagi Administrator Tenant (Klien) atau Global Admin platform. Berisi pembaruan penagihan, status pembayaran, dan peringatan kritis penggunaan kuota.
2.  **`OPERATIONAL`**: Ditujukan bagi karyawan umum atau manajer operasional. Berisi pengingat absensi, status alur kerja, pengumuman perusahaan, dan notifikasi slip gaji.

---

## ⚙️ 2. Konfigurasi Sistem Email

Semua notifikasi email diproses secara asinkron agar tidak membebani performa request HTTP utama pengguna. Pengiriman email dikontrol oleh beberapa parameter di konfigurasi backend (`settings.py`):

*   **`ENABLE_EMAIL_NOTIFICATIONS`**: Boolean flag (`True` / `False`) untuk mengaktifkan atau menonaktifkan seluruh email keluar secara global.
*   **Identitas Pengirim**:
    *   *Nama Pengirim*: `HariKerja HRMS`
    *   *Email Pengirim*: `noreply@harikerja.com` (atau domain email kustom penyewa).
*   **Preferensi Pengguna**: Karyawan dapat menonaktifkan penerimaan email operasional tertentu secara mandiri melalui pengaturan profil mereka di aplikasi web atau mobile (in-app notifications tetap aktif).

---

## 📊 3. Pemetaan Lengkap Peristiwa Notifikasi

### 3.1 Kategori Registrasi & Tenant
Dikelola di `backend/tenants/tasks.py`.

| Nama Peristiwa | Pemicu (Trigger) | Penerima | Saluran | Subjek / Isi Pesan Default |
| :--- | :--- | :--- | :--- | :--- |
| **Pendaftaran Diterima** | Calon tenant berhasil mengisi form pendaftaran. | Admin Tenant | Email | **Subjek**: `Pendaftaran HariKerja Diterima`<br>**Pesan**: Mengonfirmasi registrasi sedang ditinjau oleh tim onboarding. |
| **Registrasi Disetujui** | Superadmin menekan tombol setujui registrasi. | Admin Tenant | Email | **Subjek**: `Selamat Datang di HariKerja HRMS`<br>**Pesan**: Menyertakan link subdomain unik perusahaan dan kredensial login pertama. |
| **Undangan Karyawan** | HR mendaftarkan karyawan baru di portal. | Karyawan Baru | Email | **Subjek**: `Selamat Datang di HariKerja`<br>**Pesan**: Menyertakan tautan aktivasi akun dan password default untuk login pertama. |

### 3.2 Kategori Alur Kerja (Workflow Approvals)
Dikelola melalui `NotificationService` di `backend/notifications/services.py`.

| Nama Peristiwa | Pemicu (Trigger) | Penerima | Saluran | Subjek / Isi Pesan Default |
| :--- | :--- | :--- | :--- | :--- |
| **Persetujuan Tertunda** | Permintaan (Cuti/Reimburse) masuk ke tahap sequence penyetuju. | Penyetuju Aktif (Supervisor/HR) | In-App & Email | **Subjek**: `Persetujuan Diperlukan`<br>**Pesan**: `[Nama Karyawan] mengajukan [Tipe Pengajuan]. Tindakan Anda diperlukan.` |
| **Pengajuan Disetujui** | Penyetuju menyetujui di tahap final workflow. | Pemohon (Karyawan) | In-App & Email | **Subjek**: `Pengajuan Disetujui`<br>**Pesan**: `Permintaan [Tipe Pengajuan] Anda untuk tanggal [Tanggal] telah disetujui.` |
| **Pengajuan Ditolak** | Penyetuju menolak pengajuan di tahap mana pun. | Pemohon (Karyawan) | In-App & Email | **Subjek**: `Pengajuan Ditolak`<br>**Pesan**: `Permintaan [Tipe Pengajuan] Anda ditolak. Alasan: [Komentar Penolak].` |

### 3.3 Kategori Penagihan (Billing) & Batas Kuota
Dikelola melalui `NotificationService` dan verifikasi webhook Midtrans.

| Nama Peristiwa | Pemicu (Trigger) | Penerima | Saluran | Subjek / Isi Pesan Default |
| :--- | :--- | :--- | :--- | :--- |
| **Faktur Dibuat** | Faktur tagihan bulanan baru diterbitkan. | Admin Tenant | Email & In-App | **Subjek**: `Tagihan HariKerja Baru #${invoice_id}`<br>**Pesan**: Menyediakan rincian tagihan bulanan dan link checkout Midtrans. |
| **Pembayaran Sukses** | Webhook settlement Midtrans berhasil divalidasi. | Admin Tenant | Email & In-App | **Subjek**: `Pembayaran Sukses #${invoice_id}`<br>**Pesan**: Mengonfirmasi pembayaran diterima dan kuota/langganan telah diperbarui. |
| **Pembayaran Gagal** | Webhook expiry atau cancel transaksi Midtrans diterima. | Admin Tenant | Email & In-App | **Subjek**: `Pembayaran Gagal #${invoice_id}`<br>**Pesan**: Memberitahukan kegagalan pemrosesan pembayaran dan meminta transaksi ulang. |
| **Warning Kuota Karyawan** | Jumlah karyawan aktif mencapai **90%** dari limit paket. | Admin Tenant | In-App | **Pesan**: `Kapasitas karyawan Anda hampir penuh (90%). Silakan beli blok tambahan.` |
| **Limit Kuota Karyawan** | Jumlah karyawan aktif mencapai **100%** dari limit paket. | Admin Tenant | In-App & Email | **Subjek**: `Kritis: Kuota Karyawan Habis`<br>**Pesan**: Penambahan karyawan baru dinonaktifkan sampai kuota ditingkatkan. |
| **Warning Kuota Penyimpanan** | Penggunaan file media mencapai **90%** kapasitas. | Admin Tenant | In-App | **Pesan**: `Kapasitas penyimpanan hampir penuh (90%). Harap bersihkan file lama atau tambah kuota.` |
| **Limit Kuota Penyimpanan** | Penggunaan file media mencapai **100%** kapasitas. | Admin Tenant | In-App & Email | **Subjek**: `Kritis: Ruang Penyimpanan Penuh`<br>**Pesan**: Upload dokumen baru dinonaktifkan. Foto absensi otomatis dilewati. |

---

## 🛠️ 4. Panduan Pengembang (Developer Guide)

Untuk memicu notifikasi baru dari backend Django, gunakan metode pembungkus dari `NotificationService` yang sudah terstandarisasi. Jangan pernah membuat instans email manual secara langsung.

### 4.1 Kirim Notifikasi Tingkat Sistem (SaaS/Admin)
Digunakan untuk peringatan kuota atau penagihan yang ditujukan kepada admin utama perusahaan.
```python
from notifications.services import NotificationService

notification_service = NotificationService()
notification_service.send_admin_notification(
    tenant=request.tenant,
    title="Peringatan Penyimpanan Penuh",
    message="Kapasitas penyimpanan Anda mencapai 90%. Silakan lakukan peningkatan.",
    level="WARNING"  # Opsi: INFO, WARNING, CRITICAL, SUCCESS
)
```

### 4.2 Kirim Notifikasi Operasional ke Karyawan
Digunakan untuk interaksi alur kerja pengajuan.
```python
from notifications.services import NotificationService

notification_service = NotificationService()
notification_service.send_employee_notification(
    target_user=employee.user,
    title="Pengajuan Cuti Disetujui",
    message="Cuti tahunan Anda untuk tanggal 2026-06-01 telah disetujui oleh Supervisor.",
    send_email=True  # Mengirim email jika diatur True & dikonfigurasi aktif
)
```

### 4.3 Pemicu Berbasis Sinyal Post-Save (Workflow Actions)
Pengiriman notifikasi otomatis saat data pengajuan mengalami pembaruan status:
```python
from django.db.models.signals import post_save
from django.dispatch import receiver
from core.models import WorkflowAction
from notifications.services import NotificationService

@receiver(post_save, sender=WorkflowAction)
def notify_workflow_update(sender, instance, created, **kwargs):
    if created:
        service = NotificationService()
        # Logika mendeteksi approver berikutnya atau status final
        service.notify_workflow_status_change(instance)
```
