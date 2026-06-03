# Panduan Kredensial & Lingkungan Pembayaran Midtrans

Dokumen ini menjelaskan konfigurasi integrasi **Midtrans Payment Gateway** saat ini pada platform **HariKerja HRMS** serta panduan langkah-langkah untuk memindahkan sistem pembayaran ke lingkungan produksi (Live/Production).

---

## 1. Lingkungan Saat Ini: Sandbox (Simulasi/Testing)

Untuk kebutuhan pengembangan lokal, pengujian (*local testing*), serta pengujian otomatis (*automated test runners*), sistem saat ini dikonfigurasi menggunakan lingkungan **Midtrans Sandbox**.

### 1.1 Aliran Dana & Rekening di Lingkungan Sandbox
*   **Tidak Menggunakan Uang Riil**: Semua transaksi yang dibuat di lingkungan Sandbox tidak memotong atau mengirimkan uang ke rekening bank riil mana pun.
*   **Pembayaran Simulasi**: Pengujian pembayaran dilakukan menggunakan kartu kredit dummy atau simulator virtual account bank yang disediakan pada [Halaman Simulator Midtrans Sandbox](https://docs.midtrans.com/en/technical-reference/sandbox-test-credentials).
*   **Kredensial Default (Fallback)**: Jika variabel lingkungan (*env variables*) tidak diatur di berkas `.env`, backend akan otomatis menggunakan kredensial pengujian bawaan program:
    *   `MIDTRANS_SERVER_KEY` default: `SB-Mid-server-placeholder`
    *   `MIDTRANS_CLIENT_KEY` default: `SB-Mid-client-placeholder`

### 1.2 Konfigurasi Kode Program Sandbox
1.  **Sumber Script Frontend**: Pada halaman billing [frontend/src/app/[locale]/settings/billing/page.tsx](file:///home/afdhal/data/hr/hrms/frontend/src/app/%5Blocale%5D/settings/billing/page.tsx#L194-L195), script Snap SDK memuat domain Sandbox:
    ```html
    src="https://app.sandbox.midtrans.com/snap/snap.js"
    ```
2.  **Inisialisasi Backend**: Pada [backend/billing/services.py](file:///home/afdhal/data/hr/hrms/backend/billing/services.py#L9-L17), client SDK Midtrans diinisialisasi untuk membaca status sandbox:
    ```python
    self.is_production = getattr(settings, 'MIDTRANS_IS_PRODUCTION', False)
    self.server_key = getattr(settings, 'MIDTRANS_SERVER_KEY', 'SB-Mid-server-placeholder')
    self.client_key = getattr(settings, 'MIDTRANS_CLIENT_KEY', 'SB-Mid-client-placeholder')
    ```

---

## 2. Panduan Migrasi ke Lingkungan Produksi (Live/Production)

Untuk mengaktifkan pembayaran asli dari tenant/perusahaan pelanggan, ikuti langkah-langkah berikut:

### 2.1 Konfigurasi Akun Bisnis Midtrans
1.  **Daftarkan Akun Bisnis**: Daftar di portal resmi [Midtrans](https://midtrans.com) dan selesaikan verifikasi legalitas bisnis (KYC) dengan mengirimkan dokumen legalitas perusahaan seperti NIB, SIUP, NPWP perusahaan, KTP Direktur, dan dokumen pendukung lainnya.
2.  **Daftarkan Rekening Bank Penampung**:
    *   Masuk ke **Midtrans MAP (Merchant Administration Portal)**.
    *   Buka menu **Settings** > **Billing / Bank Account**.
    *   Daftarkan **Nomor Rekening Bank resmi milik perusahaan/PT HariKerja**. 
    *   Seluruh dana langganan yang dibayarkan oleh tenant akan dikumpulkan oleh Midtrans dan ditransfer secara otomatis (*settled*) ke rekening bank terdaftar ini setiap hari (H+1).

### 2.2 Memperbarui Variabel Lingkungan (.env)
Perbarui variabel lingkungan di server produksi Anda (misalnya di `deploy/environments/.env.production` atau pengaturan container environment) dengan kredensial produksi:

```bash
# --- Konfigurasi Midtrans Produksi ---
MIDTRANS_IS_PRODUCTION=True
MIDTRANS_SERVER_KEY=Mid-server-SERVER_KEY_PRODUKSI_ANDA
MIDTRANS_CLIENT_KEY=Mid-client-CLIENT_KEY_PRODUKSI_ANDA

# --- Variabel Build Frontend ---
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=Mid-client-CLIENT_KEY_PRODUKSI_ANDA
```

> [!IMPORTANT]
> Pastikan script Snap SDK di frontend billing dimuat dari domain produksi `https://app.midtrans.com/snap/snap.js` ketika `MIDTRANS_IS_PRODUCTION` bernilai `True`.

### 2.3 Konfigurasi Webhook Notification
Midtrans mengirimkan status sukses/gagal pembayaran secara asinkron melalui callback HTTP. Anda wajib mendaftarkan alamat endpoint webhook di dasbor Midtrans:

1.  Masuk ke **Portal Merchant Midtrans** (mode Production).
2.  Buka menu **Settings** > **Access Keys** atau **Configuration**.
3.  Isi kolom **Payment Notification URL** dengan alamat endpoint backend Anda:
    `https://[domain-produksi-anda].com/api/billing/webhook/`
4.  Simpan perubahan konfigurasi.

---

## 3. Alur Verifikasi Tanda Tangan Webhook (Signature Verification)

Backend melakukan verifikasi tanda tangan di setiap request webhook untuk mencegah pemalsuan status sukses transaksi:
1.  Request POST masuk ke `/api/billing/webhook/`.
2.  Backend mengambil data `order_id`, `status_code`, `gross_amount`, dan `signature_key` dari request payload.
3.  Backend menghitung signature yang diharapkan dengan rumus:
    $$\text{Signature} = \text{SHA512}(\text{order\_id} + \text{status\_code} + \text{gross\_amount} + \text{Server Key Produksi})$$
4.  Jika hasil perhitungan backend sama dengan `signature_key` yang dikirim Midtrans, status invoice diperbarui menjadi `PAID` dan masa aktif langganan tenant diperpanjang. Jika tidak sama, transaksi ditolak (*Unauthorized*).

---

## 🔗 Dokumen Terkait
*   [Developer Guide (Bahasa Indonesia)](./developer_guide.id.md)
*   [Rencana Integrasi Pembayaran Gaji Langsung](../workflows_features/direct_payroll_payout.id.md)
