# 🚀 HariKerja HRMS: Pitch Deck & Panduan Aplikasi

Dokumen ini berisi draf jawaban formulir aplikasi dan struktur pitch deck untuk aplikasi pendanaan **HariKerja HRMS** ke **East Ventures**, diselaraskan dengan Cetak Biru Bisnis 24 Bulan kami.

---

## 📝 Jawaban Formulir Aplikasi (Maksimal < 300 Karakter)

### 1. What's the problem you're trying to solve?
```text
Bisnis di Indonesia lintas segmen UMK, UMM, dan Enterprise menghadapi hambatan digitalisasi HR karena tarif software per-karyawan yang mahal. Ini membuat skala biaya tidak terprediksi, memaksa ketergantungan pada spreadsheet manual yang rawan kesalahan untuk absensi, BPJS, dan PPh 21.
```
*(Jumlah karakter: 282 / Max: 300)*

### 2. How are you going to solve the problem?
```text
Kami membangun HariKerja, SaaS HRMS multi-tenant dengan tarif flat sesuai skala bisnis (UMK, UMM, Enterprise). Kami menawarkan absensi mobile berbasis verifikasi wajah, alur kerja ESS, dan mesin penggajian BPJS/PPh 21 TER, menghapus hambatan biaya per-karyawan.
```
*(Jumlah karakter: 268 / Max: 300)*

### 3. What's your value proposition?
```text
HariKerja mengganggu HRIS tradisional dengan menawarkan tarif flat aman (Rp 125rb - 5jt/bln) bagi UMK, UMM, dan Enterprise, menghemat biaya hingga 75%. Kami mengisolasi skema database 100% demi keamanan data dan menyediakan aplikasi Flutter ESS dengan ketahanan offline.
```
*(Jumlah karakter: 279 / Max: 300)*

### 4. How big is the market?
```text
Kami menargetkan 50-60 juta pekerja formal Indonesia. Menguasai 2% pasar lintas UMK, UMM, dan Enterprise (13.5rb perusahaan) menghasilkan 1 juta pengguna aktif. Skala ini menghasilkan Rp 3.22 Miliar/bulan (Rp 38.64M ARR) dengan margin kotor efisien 70-80%.
```
*(Jumlah karakter: 249 / Max: 300)*

---

## 💎 Strategi Paket Berlangganan (Subscription Plan Strategy)

Model penetapan harga kami menggunakan tarif flat per tier yang dapat diprediksi, bukan sistem tagihan per kepala (per-seat):

| Tingkat Paket | Biaya Bulanan (IDR) | Segmen Sasaran | Kuota Dasar (Karyawan) | Kapasitas Maks (Karyawan) | Modul yang Disertakan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ESSENTIAL** | Rp 125.000 | **UMK** (Usaha Mikro & Kecil) | 25 | 100 | Absensi Geofencing, Izin/Cuti, Persetujuan |
| **PROFESSIONAL** | Rp 350.000 | **UMM** (Usaha Menengah) | 100 | 1.000 | Penggajian Indonesia (TER 2024 PPh 21, BPJS), Reimbursement |
| **PREMIUM** | Rp 1.500,000 | **Enterprise** | 500 | 999.999 | Penilaian Kinerja, KPI, Custom RBAC |
| **DEDICATED** | Rp 5.000.000 | **Large Enterprise** | 2.000 | Kustom / Tanpa Batas | Server dedikasi, audit log, SLA 24/7 |

---

## 📈 Skenario Target 1 Juta Pengguna Aktif

Untuk mencapai **1.000.000 Pengguna Aktif**, kami memodelkan tiga skenario distribusi pasar yang berbeda:

### Skenario 1: Distribusi Cetak Biru (Fokus Retail + Korporat / Baseline)
*   **Komposisi Sasaran**:
    *   *Essential (UMK)*: 10.000 tenant (Rata-rata 30 karyawan/perusahaan) -> Rp 1,25 Miliar/bulan
    *   *Professional (UMM)*: 3.000 tenant (Rata-rata 100 karyawan/perusahaan) -> Rp 1,05 Miliar/bulan
    *   *Premium (Enterprise)*: 450 tenant (Rata-rata 600 karyawan/perusahaan) -> Rp 675 Juta/bulan
    *   *Dedicated (Large)*: 50 tenant (Rata-rata 2.600 karyawan/perusahaan) -> Rp 250 Juta/bulan
*   **Metrik Proyeksi**:
    *   *Total Perusahaan Dibutuhkan*: **13.500 perusahaan**
    *   *Pendapatan Recurring Bulanan (MRR)*: **Rp 3.220.000.000 (Rp 3,22 Miliar)**
    *   *Pendapatan Recurring Tahunan (ARR)*: **Rp 38.640.000.000 (Rp 38,64 Miliar)**
    *   *Margin Kotor (Gross Margin)*: **70% - 80%**

### Skenario 2: Dominan UKM/UMK (Fokus Volume Tinggi)
*   **Komposisi Sasaran**:
    *   *Essential (UMK)*: 25.000 tenant (Rata-rata 20 karyawan/perusahaan) -> Rp 3,125 Miliar/bulan
    *   *Professional (UMM)*: 4.000 tenant (Rata-rata 75 karyawan/perusahaan) -> Rp 1,4 Miliar/bulan
    *   *Premium (Enterprise)*: 350 tenant (Rata-rata 500 karyawan/perusahaan) -> Rp 525 Juta/bulan
    *   *Dedicated (Large)*: 10 tenant (Rata-rata 2.500 karyawan/perusahaan) -> Rp 50 Juta/bulan
*   **Metrik Proyeksi**:
    *   *Total Perusahaan Dibutuhkan*: **29.360 perusahaan**
    *   *Pendapatan Recurring Bulanan (MRR)*: **Rp 5.100.000.000 (Rp 5,1 Miliar)**
    *   *Pendapatan Recurring Tahunan (ARR)*: **Rp 61.200.000.000 (Rp 61,2 Miliar)**

### Skenario 3: Dominan Enterprise (Fokus Nilai Tinggi / Volume Rendah)
*   **Komposisi Sasaran**:
    *   *Essential (UMK)*: 5.000 tenant (Rata-rata 20 karyawan/perusahaan) -> Rp 625 Juta/bulan
    *   *Professional (UMM)*: 2.500 tenant (Rata-rata 100 karyawan/perusahaan) -> Rp 875 Juta/bulan
    *   *Premium (Enterprise)*: 1.000 tenant (Rata-rata 500 karyawan/perusahaan) -> Rp 1,5 Miliar/bulan
    *   *Dedicated (Large)*: 60 tenant (Rata-rata 2.500 karyawan/perusahaan) -> Rp 300 Juta/bulan
*   **Metrik Proyeksi**:
    *   *Total Perusahaan Dibutuhkan*: **8.560 perusahaan**
    *   *Pendapatan Recurring Bulanan (MRR)*: **Rp 3.300.000.000 (Rp 3,3 Miliar)**
    *   *Pendapatan Recurring Tahunan (ARR)*: **Rp 39.600.000.000 (Rp 39,6 Miliar)**

---

## 📑 Struktur Slide Pitch Deck

File presentasi PowerPoint dan PDF pendukung telah dibuat di:
*   Presentasi PowerPoint: [east_ventures_pitch_deck.pptx](file:///home/afdhal/data/hr/hrms/docs/business_strategy/east_ventures_pitch_deck.pptx)
*   Dokumen PDF: [east_ventures_pitch_deck.pdf](file:///home/afdhal/data/hr/hrms/docs/business_strategy/east_ventures_pitch_deck.pdf)

Berikut adalah detail isi per slide:

### 1. Slide 1: Cover & Visi
*   **Judul:** HariKerja HRMS
*   **Sub-judul:** Mendemokrasikan Digitalisasi HR untuk Segmen UMK, UMM, dan Enterprise dengan Harga Flat-Tier.
*   **Poin Kunci:** Platform SaaS multi-tenant modern yang aman untuk mendigitalisasi 1 Juta pekerja aktif dengan membuat fitur kelas enterprise terjangkau.

### 2. Slide 2: Masalah
*   **Pinalti Skalabilitas:** Pemimpin pasar HRIS saat ini mengenakan biaya per karyawan yang mahal. Biaya membengkak sejalan dengan pertumbuhan bisnis.
*   **Ketergantungan Spreadsheet:** Lebih dari 80% perusahaan mengandalkan spreadsheet manual yang tidak efisien untuk melacak absensi dan izin.
*   **Risiko Kepatuhan:** Perhitungan iuran BPJS dan pajak PPh 21 TER secara manual sangat rawan kesalahan.

### 3. Slide 3: Solusi
*   **Harga Flat Disruptif:** Paket mulai dari Rp 125.000 /bulan. Bisnis berkembang tanpa peningkatan pengeluaran software secara linier.
*   **Kepatuhan Lokal Tanpa Konfigurasi:** Otomatisasi perhitungan BPJS Kesehatan & Ketenagakerjaan serta pajak PPh 21 TER.
*   **Aplikasi ESS Mobile:** Aplikasi Flutter dengan geofencing cerdas, absensi verifikasi wajah, ketahanan offline, dan slip gaji digital.

### 4. Slide 4: Peluang Pasar & Segmentasi
*   **Subscription Plan Strategy**
    *   *Segmen UMK (Essential)*: Flat Rp 125rb/bln | Batas maks 100 karyawan.
    *   *Segmen UMM (Professional)*: Flat Rp 350rb/bln | Batas maks 1.000 karyawan.
    *   *Segmen Enterprise (Premium)*: Flat Rp 1.5jt/bln | Batas maks 999.999 karyawan.
    *   *Large Enterprise (Dedicated)*: Kustom dari Rp 5jt/bln | 2.000+ karyawan, server cloud dedikasi.

### 5. Slide 5: Proyeksi Keuangan Skala 1 Juta Pengguna
*   **3 Skenario Skalabilitas**:
    *   *Distribusi Cetak Biru*: 13.5rb tenant, Rp 3,22M MRR (Rp 38,64M ARR) dengan margin kotor 70-80%.
    *   *Fokus UMK*: 29.3rb tenant, Rp 5,1M MRR (Rp 61,2M ARR).
    *   *Fokus Enterprise*: 8.5rb tenant, Rp 3,3M MRR (Rp 39,6M ARR).

### 6. Slide 6: Strategi Pemasaran
*   **Iklan Search Engine Niat Tinggi:** Memfokuskan anggaran pemasaran pada kata kunci pencarian seperti *"Aplikasi Payroll Murah"*, *"Kalkulator PPh 21 TER"*, dan *"HRIS murah"*.
*   **Pertumbuhan Berbasis Produk (Product-Led):** Pendaftaran mandiri dan provisi server otomatis memangkas Biaya Akuisisi Pelanggan (CAC).
*   **Retensi Tinggi:** Produk HRMS sangat sulit diganti (*sticky*); setelah sistem absensi dan payroll berjalan, rasio churn sangat rendah.

### 7. Slide 7: Teknologi & Keamanan
*   **Isolasi Skema Database:** Isolasi skema per tenant pada database PostgreSQL menjamin privasi dan keamanan data 100%.
*   **Gerbang Akses VPN Privat:** Konsol Django Admin dibatasi pada level Nginx dan hanya dapat diakses melalui VPN (OpenVPN/WireGuard).
*   **Autentikasi Akun:** Verifikasi login multi-faktor (MFA / 2FA) dengan token TOTP 6-digit untuk semua tindakan administratif.

### 8. Slide 8: Tim & Pendanaan (Call to Action)
*   **Target Pendanaan (*Seed Round*):** **Rp 3.600.000.000** untuk **12.5% saham baru** (Post-money valuation: **Rp 28.800.000.000 / $1.8M USD**).
*   **Masa Runway Operasional**: 24 Bulan runway untuk membangun Skenario B (Setup Pertumbuhan), mendanai pengadaan alat kerja tim (MacBook Pro/Air & HP testing), dan mencapai status profit mandiri.
*   **Kontak:** info@harikerja.web.id | [https://harikerja.web.id](https://harikerja.web.id) (Lingkungan QA, produksi nanti di HariKerja.com)

---

## 🔗 Referensi Dokumen Internal
*   Cetak Biru Bisnis (ID): [blueprint_business_budget_24_months-id.md](file:///home/afdhal/data/hr/hrms/docs/business_strategy/blueprint_business_budget_24_months-id.md)
*   Business Blueprint (EN): [blueprint_business_budget_24_months.md](file:///home/afdhal/data/hr/hrms/docs/business_strategy/blueprint_business_budget_24_months.md)
*   Proyeksi Keuangan: [business_projections.md](file:///home/afdhal/data/hr/hrms/docs/business_strategy/business_projections.md)
*   Analisis Kompetitor: [market_strategy_2026.md](file:///home/afdhal/data/hr/hrms/docs/business_strategy/market_strategy_2026.md)
*   Proyeksi 1 Juta Pengguna: [ultimate_target_1m_users.md](file:///home/afdhal/data/hr/hrms/docs/business_strategy/ultimate_target_1m_users.md)
