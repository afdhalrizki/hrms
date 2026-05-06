# Pemetaan Notifikasi: Klien & Admin (Langganan/Penagihan)
Versi: 1.0
Status: Diusulkan

Dokumen ini memetakan notifikasi yang diperlukan bagi **Administrator Tenant** (Klien) terkait siklus hidup langganan mereka, peristiwa penagihan, dan kuota sumber daya dalam platform HRMS.

---

## 💎 1. Siklus Hidup Langganan
Notifikasi yang terkait dengan status akses tenant ke platform.

| Peristiwa | Tingkat | Pemicu | Pesan |
| :--- | :--- | :--- | :--- |
| **Segera Kedaluwarsa** | INFO | 7 hari sebelum `expiry_date` | "Langganan Anda berakhir dalam 7 hari. Perbarui sekarang untuk menghindari gangguan layanan." |
| **Peringatan Akhir** | WARNING | 3 hari sebelum `expiry_date` | "Langganan Anda berakhir dalam 3 hari. Akses akan menjadi Baca-Saja setelah tanggal jatuh tempo." |
| **Langganan Kedaluwarsa** | WARNING | `expiry_date` terlewati (Masa Tenggang) | "Langganan kedaluwarsa. Sistem sekarang dalam mode **Baca-Saja**. Harap perbarui untuk memulihkan akses penuh." |
| **Akun Ditangguhkan** | CRITICAL | Masa tenggang (14 hari) terlewati | "Akun ditangguhkan karena belum ada pembayaran. Akses diblokir. Hubungi dukungan untuk pemulihan data." |
| **Perpanjangan Berhasil** | SUCCESS | Penyelesaian pembayaran | "Terima kasih! Langganan Anda untuk paket [Plan] telah berhasil diperbarui hingga [Date]." |

---

## 💳 2. Penagihan & Pembayaran
Interaksi dengan payment gateway (Midtrans) dan catatan keuangan.

| Peristiwa | Tingkat | Pemicu | Pesan |
| :--- | :--- | :--- | :--- |
| **Faktur Dibuat** | INFO | Checkout dimulai | "Faktur baru #[ID] dibuat untuk [Plan/Add-on]. Silakan selesaikan pembayaran Anda." |
| **Pembayaran Berhasil** | SUCCESS | Webhook Midtrans (Settlement) | "Pembayaran untuk Faktur #[ID] telah diterima. Kuota/paket Anda telah diperbarui secara otomatis." |
| **Pembayaran Gagal** | ERROR | Webhook Midtrans (Deny/Expire) | "Pembayaran untuk Faktur #[ID] gagal atau kedaluwarsa. Silakan coba lagi atau gunakan metode yang berbeda." |

---

## 📈 3. Kuota Sumber Daya (Kuota Elastis)
Peringatan yang berfokus pada batas "Hard Cap" dari model harga bertingkat.

| Peristiwa | Tingkat | Pemicu | Pesan |
| :--- | :--- | :--- | :--- |
| **Limit Karyawan Mendekati** | INFO | 90% dari `total_employee_capacity` | "Kapasitas karyawan Anda hampir penuh (90%). Pertimbangkan untuk membeli **blok Tambahan**." |
| **Limit Karyawan Penuh** | WARNING | 100% dari `total_employee_capacity` | "Batas karyawan tercapai. Anda tidak dapat menambah karyawan lagi sampai Anda menambah kuota." |
| **Hard Cap Tingkat Tercapai** | WARNING | Mencoba tambahan di batas tingkat | "Anda telah mencapai batas tambahan maksimum untuk tingkat [Essential]. Untuk menambah staf, silakan tingkatkan ke [Professional]." |
| **Peringatan Penyimpanan** | WARNING | 80% dari `storage_limit_mb` | "Penyimpanan file Anda mencapai batasnya. Harap hapus dokumen lama atau tingkatkan paket Anda." |

---

## 🛠️ Catatan Implementasi
- **Pengiriman Saluran**: Notifikasi dalam aplikasi (lonceng bilah sisi) + Email untuk peristiwa Kritis/Penagihan.
- **Model Backend**: `SystemNotification` dari `core.models`.
- **Worker**: Pekerjaan cron mingguan/harian (Celery) untuk pemeriksaan kedaluwarsa dan penyimpanan.
