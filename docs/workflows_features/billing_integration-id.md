# Penagihan SaaS & Integrasi Pembayaran (Midtrans)

Dokumen ini merinci implementasi arsitektur sistem penagihan langganan otomatis untuk platform harikerja HRMS.

## 💳 Tinjauan Arsitektur

Sistem menggunakan **Midtrans Snap** untuk pengalaman pembayaran di frontend dan **Webhook Listener** di backend untuk sinkronisasi status.

### 1. Alur Data (Alur Perpanjangan)
1.  **Pemilihan**: Admin tenant memilih paket atau durasi perpanjangan di **Halaman Penagihan**.
2.  **Checkout**: Frontend memanggil `/api/billing/checkout/`.
3.  **Pembuatan Token**:
    *   Backend membuat catatan `SubscriptionInvoice` dengan `status=PENDING`.
    *   Backend memanggil Midtrans Snap API dengan `order_id` dan nominal.
    *   Midtrans mengembalikan `snap_token`.
4.  **Pembayaran**: Frontend membuka Snap Popup menggunakan token tersebut.
5.  **Penyelesaian**: Pengguna membayar melalui Transfer Bank, E-Wallet, atau Kartu Kredit.
6.  **Webhook**: Midtrans mengirimkan permintaan POST ke `/api/billing/webhook/`.
7.  **Finalisasi**:
    *   Backend memvalidasi tanda tangan (signature).
    *   Backend memperbarui `SubscriptionInvoice` menjadi `PAID`.
    *   Backend memperbarui `expiry_date` pada model `Tenant` (tanggal saat ini + 30/365 hari).
    *   Sistem membuat `SystemNotification` untuk tenant tersebut.

## 🔒 Keamanan Webhook

Untuk mencegah pembaruan status yang tidak sah, handler webhook memverifikasi status Midtrans menggunakan bidang-bidang berikut:
- `order_id`: Harus ada di `SubscriptionInvoice`.
- `status_code`: Harus `200`.
- `signature_key`: Verifikasi hash SHA512: `order_id + status_code + gross_amount + ServerKey`.

## 🗄️ Model Database

### SubscriptionInvoice (Skema Bersama)
Dikelola dalam skema `public` karena pembayaran ditangani pada tingkat platform.

| Bidang | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `tenant` | FK | Tautan ke Tenant |
| `amount` | Decimal | Nominal dalam IDR |
| `status` | Char | PENDING, PAID, FAILED, EXPIRED |
| `payment_type` | Char | bank_transfer, gopay, dll. |
| `expiry_date_extension` | Integer | Hari yang akan ditambahkan saat berhasil |

---

## 🚀 Sandbox vs Produksi

| Lingkungan | URL Midtrans | Server Key |
| :--- | :--- | :--- |
| **Pengembangan** | `https://app.sandbox.midtrans.com` | `SB-Mid-server-...` |
| **Produksi** | `https://app.midtrans.com` | `Mid-server-...` |

---
> [!CAUTION]
> Jangan pernah memasukkan `MIDTRANS_SERVER_KEY` ke dalam kontrol versi. Selalu gunakan variabel lingkungan.
