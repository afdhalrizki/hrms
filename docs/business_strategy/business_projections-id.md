# Proyeksi Bisnis & Analisis Target Profit Rp 50 Juta per Bulan

Dokumen ini menganalisis strategi keuangan, perhitungan unit ekonomi, dan dua skenario operasional (biaya rendah vs biaya tinggi) untuk mencapai target profit bersih **Rp 50.000.000 per bulan** pada platform **HariKerja HRMS**.

---

## 📊 1. Asumsi Pendapatan Rata-Rata per Klien (ARPU)

Platform HariKerja ditawarkan dalam tiga paket langganan utama:
1.  **Essential**: Rp125.000 /bulan.
2.  **Professional**: Rp750.000 /bulan.
3.  **Premium**: Rp1.500.000 /bulan.

Berdasarkan analisis pasar SaaS HRMS di Indonesia, kami berasumsi distribusi penyebaran tipe paket di kalangan tenant adalah sebagai berikut:
*   **60%** memilih Paket *Essential* (Fokus pada Absensi Geofencing & Cuti).
*   **30%** memilih Paket *Professional* (Fokus pada Penggajian PPh 21 TER 2024 & Slip Gaji).
*   **10%** memilih Paket *Premium* (Perusahaan besar dengan modul KPI/Performance).

Berdasarkan distribusi tersebut, diperoleh nilai **ARPU (Average Revenue Per User/Tenant)** bulanan:
$$\text{ARPU} = (0.60 \times 125.000) + (0.30 \times 750.000) + (0.10 \times 1.500.000)$$
$$\text{ARPU} = 75.000 + 225.000 + 150.000 = \text{Rp450.000 per tenant/bulan}$$

---

## 📈 2. Skenario Operasional untuk Mencapai Target Profit Rp 50 Juta

Untuk menghasilkan keuntungan bersih Rp50.000.000 /bulan, kami memodelkan dua skenario biaya operasional (OpEx):

### 🏢 Skenario A: Operasional Ramping / Biaya Rendah (Low OpEx Setup)
Skenario ini berasumsi tim beroperasi dalam fase *Bootstrapping* dengan pendiri bertindak sebagai pelaksana multi-peran (cross-functional).

*   **Rincian Biaya Operasional Bulanan (OpEx)**:
    *   *Sewa Cloud Server (AWS/DigitalOcean)*: Rp2.500.000
    *   *Biaya Layanan Pihak Ketiga (Midtrans, Sendgrid, Sentry)*: Rp1.500.000
    *   *Pemasaran & Iklan digital*: Rp2.000.000
    *   *Gaji & Tunjangan Staf Support Junior*: Rp4.000.000
    *   *Total OpEx Bulanan*: **Rp10.000.000**
*   **Kalkulasi Target Pendapatan Kotor (Revenue)**:
    $$\text{Target Revenue} = \text{Target Profit} + \text{OpEx}$$
    $$\text{Target Revenue} = 50.000.000 + 10.000.000 = \text{Rp60.000.000 /bulan}$$
*   **Target Jumlah Tenant Aktif**:
    $$\text{Target Tenant} = \frac{\text{Target Revenue}}{\text{ARPU}} = \frac{60.000.000}{450.000} \approx \mathbf{134\text{ Tenant}}$$
*   **Distribusi Paket Tenant**:
    *   Essential: 80 Tenant (Rp10.000.000)
    *   Professional: 40 Tenant (Rp30.000.000)
    *   Premium: 14 Tenant (Rp21.000.000)
    *   *Total Pendapatan Aktual*: Rp61.000.000

---

### 🚀 Skenario B: Operasional Skala Cepat / Biaya Tinggi (High OpEx Setup)
Skenario ini digunakan setelah perusahaan mendapatkan pendanaan awal (*Seed Funding*) untuk merekrut tim pengembang profesional dan mempercepat penetrasi pasar.

*   **Rincian Biaya Operasional Bulanan (OpEx)**:
    *   *Sewa Cloud Server (High Availability AWS & Backup)*: Rp15.000.000
    *   *Biaya Layanan Pihak Ketiga & Legal Compliance*: Rp5.000.000
    *   *Gaji Pengembang Teknik (2 Backend, 2 Frontend, 1 DevOps)*: Rp45.000.000
    *   *Gaji 2 Agen Penjualan & 2 Staf Onboarding Support*: Rp20.000.000
    *   *Pemasaran, Event & Iklan B2B*: Rp15.000.000
    *   *Sewa Kantor & Utilitas*: Rp10.000.000
    *   *Total OpEx Bulanan*: **Rp110.000.000**
*   **Kalkulasi Target Pendapatan Kotor (Revenue)**:
    $$\text{Target Revenue} = 50.000.000 + 110.000.000 = \text{Rp160.000.000 /bulan}$$
*   **Target Jumlah Tenant Aktif**:
    $$\text{Target Tenant} = \frac{160.000.000}{450.000} \approx \mathbf{356\text{ Tenant}}$$
*   **Distribusi Paket Tenant**:
    *   Essential: 214 Tenant (Rp26.750.000)
    *   Professional: 107 Tenant (Rp80.250.000)
    *   Premium: 35 Tenant (Rp52.500.000)
    *   *Total Pendapatan Aktual*: Rp159.500.000

---

## 🎯 3. Ringkasan Perbandingan & Rekomendasi Bisnis

| Parameter Finansial | Skenario A (Low OpEx) | Skenario B (High OpEx) |
| :--- | :--- | :--- |
| **Model Tim** | Bootstrapping (Pendiri Mandiri) | Funded (Tim Profesional) |
| **OpEx Bulanan** | Rp10.000.000 | Rp110.000.000 |
| **Kebutuhan Tenant** | 134 Tenant | 356 Tenant |
| **Total Pengguna Aktif** | ~4.500 Karyawan | ~12.000 Karyawan |
| **Risiko Teknis** | Menengah (Dukungan Terbatas) | Rendah (Tim QA & Dedicated DevOps) |
| **Tingkat Pertumbuhan** | Lambat & Stabil | Cepat & Agresif |

### Rekomendasi Strategi Eksekusi:
1.  **Fase 1 (Bulan 1-6)**: Mulai dengan Skenario A (Low OpEx). Kejar target 50 tenant pertama untuk membuktikan kestabilan core product dan alur kas positif tanpa beban gaji tinggi.
2.  **Fase 2 (Bulan 7+)**: Setelah mencapai cash flow positif, tingkatkan kapasitas server dan rekrut tim support secara bertahap menuju transisi Skenario B untuk mempercepat akuisisi pasar korporat tingkat menengah.
