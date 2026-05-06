# Proyeksi Bisnis & Analisis Finansial (v1.0)

Dokumen ini memberikan proyeksi finansial konservatif untuk platform **harikerja HRMS** berdasarkan model "Hybrid Freemium + Penetapan Harga Bertingkat".

---

## 1. Estimasi Biaya Operasional (OpEx)

Untuk memelihara platform SaaS dengan ketersediaan tinggi, kami memperkirakan tingkat pengeluaran bulanan (burn rate) berikut untuk fase peluncuran awal (0–1.000 tenant aktif).

| Kategori Biaya | Deskripsi | Estimasi Bulanan (IDR) |
| :--- | :--- | :--- |
| **Infrastruktur Cloud** | AWS/GCP (EC2, RDS, S3, Redis, PGBouncer) | Rp 3.000.000 |
| **API Komunikasi** | SendGrid (Email) & WhatsApp Gateway | Rp 1.500.000 |
| **Payment Gateway** | Biaya transaksi Midtrans (Estimasi) | Rp 500.000 |
| **Pemeliharaan & Keamanan**| Patch keamanan, cadangan, dan pemantauan | Rp 1.000.000 |
| **TOTAL OPEX** | | **Rp 6.000.000** |

---

## 2. Skenario Pendapatan

Berdasarkan tingkatan harga kami: **Free (Rp 0)**, **Essential (Rp 250rb)**, **Professional (Rp 750rb)**, **Premium (Rp 1,5jt)**, dan **Enterprise (Kustom)**.

### Skenario A: Peluncuran Awal (Bulan 1-3)
*Target: Pengadopsi awal (early adopters) dan jaringan dekat.*
*   10 Tenant (Essential) @ 250rb = Rp 2.500.000
*   5 Tenant (Professional) @ 750rb = Rp 3.750.000
*   **Pendapatan Bruto**: **Rp 6.250.000**
*   **Laba Bersih**: **Rp 250.000** (Titik Impas/Break-Even tercapai)

### Skenario B: Pertumbuhan Pasar (Bulan 6-12)
*Target: Kluster UMKM dan rujukan (referrals).*
*   40 Tenant (Essential) @ 250rb = Rp 10.000.000
*   25 Tenant (Professional) @ 750rb = Rp 18.750.000
*   5 Tenant (Premium) @ 1,5jt = Rp 7.500.000
*   1 Tenant (Enterprise) @ Negosiasi = Rp 10.000.000
*   **Pendapatan Bruto**: **Rp 46.250.000**
*   **Opex (Berskala)**: Rp 10.000.000
*   **Laba Bulanan Bersih**: **Rp 36.250.000**

---

## 3. Metrik Finansial Utama

### 3.1 Titik Impas (Break-Even Point - BEP)
Untuk menutupi OpEx awal sebesar **Rp 6.000.000**:
*   Anda hanya membutuhkan **8 Klien** pada **Paket Professional**.
*   ATAU **24 Klien** pada **Paket Essential**.

### 3.2 Lifetime Value (LTV) vs CAC
*   **LTV**: Mengingat HRMS adalah produk yang "lengket", kami mengharapkan retensi rata-rata selama **24 bulan**.
    *   LTV Professional = Rp 750rb x 24 = **Rp 18.000.000**.
*   **CAC (Customer Acquisition Cost)**: Jika Anda menghabiskan Rp 2.000.000 untuk iklan untuk mendapatkan 1 klien Professional, Anda memiliki **9x ROI**.

---

## 4. Rekomendasi Strategis untuk Profitabilitas

1.  **Fokus pada Tingkat Professional**: Ini adalah "Sapi Perah" (Cash Cow). Dimasukkannya Penggajian membuatnya penting bagi bisnis Indonesia mana pun dengan >20 karyawan.
2.  **Freemium sebagai Saluran (Pipeline)**: Gunakan **Paket FREE** (hingga 10 karyawan) untuk menurunkan biaya akuisisi. Pengguna ini pada akhirnya akan meningkatkan paket seiring pertumbuhan mereka.
3.  **Kustomisasi Enterprise**: Satu kesepakatan Enterprise seringkali dapat membayar seluruh infrastruktur Anda selama satu tahun. Prioritaskan untuk mendapatkan setidaknya satu klien besar (2.000+ karyawan).
4.  **Pembayaran Di Muka Tahunan**: Berikan insentif untuk pembayaran tahunan (diskon 20%) untuk meningkatkan arus kas guna pengembangan lebih lanjut.

---
**Penafian**: Angka-angka ini adalah estimasi untuk tujuan perencanaan dan dapat bervariasi berdasarkan konsumsi cloud aktual dan dinamika pasar.
