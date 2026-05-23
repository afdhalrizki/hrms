# Panduan Paket Langganan & Strategi Penetapan Harga (Pricing)

Dokumen ini menjelaskan strategi bisnis, rincian tingkatan paket (*subscription tiers*), kuota batas penggunaan sumber daya, serta harga kuota elastis (*add-ons*) pada platform **HariKerja HRMS**.

---

## 💎 1. Tingkatan Paket Langganan (Subscription Tiers)

Platform HariKerja ditawarkan menggunakan sistem harga datar per tingkatan paket (*flat rate per tier*), bukan biaya per karyawan (*per-user pricing*). Model ini dirancang agar biaya operasional HR klien terprediksi dengan baik seiring pertumbuhan organisasi mereka.

| Nama Paket | Biaya Bulanan (IDR) | Kuota Dasar Karyawan | Batas Maksimal Upgrade | Batas Penyimpanan Dasar | Modul Utama yang Terbuka |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FREE** | Rp0 | 10 | 10 (Tidak Bisa Upgrade) | 50 MB | Profil Karyawan, Dasbor Kehadiran Dasar |
| **ESSENTIAL** | Rp125.000 | 25 | 100 Karyawan | 250 MB | Kehadiran GPS + Geofencing, Manajemen Cuti & Izin, Approval Berjenjang |
| **PROFESSIONAL** | Rp750.000 | 100 | 1.000 Karyawan | 1 GB | Modul Essential, Modul Payroll Indonesia (TER 2024 PPh 21 & BPJS), Reimbursements |
| **PREMIUM** | Rp1.500.000 | 500 | 999.999 Karyawan | 5 GB | Modul Professional, KPI & Performance Management, RBAC Kustom, Integrasi Multi-Cabang |
| **ENTERPRISE** | Mulai Rp5.000.000 | 2.000 (Kustom) | Kustom | 20 GB | Seluruh Modul Terbuka, Fitur Audit Logs Lengkap, Dedicated Cloud Server, SLA Dukungan 24/7 |


---

## 📈 2. Kuota Elastis & Blok Tambahan (Add-on Quotas)

Jika penyewa (tenant) membutuhkan kapasitas lebih besar tetapi belum siap untuk bermigrasi ke paket di atasnya, mereka dapat membeli **Blok Add-on** bulanan yang akan ditambahkan langsung pada tagihan berikutnya:

### 2.1 Tambahan Kapasitas Karyawan
Dijual dalam kelipatan **+5 Karyawan**:
*   *Essential Tier*: Rp25.000 /bulan per blok.
*   *Professional Tier*: Rp50.000 /bulan per blok.
*   *Premium Tier*: Rp75.000 /bulan per blok.

### 2.2 Tambahan Ruang Penyimpanan
Dijual dalam kelipatan **+1 GB**:
*   Rp50.000 /bulan per blok (berlaku seragam untuk seluruh tingkatan paket).

---

## 🔒 3. Aturan & Validasi Perubahan Paket (Upgrade & Downgrade Policies)

Untuk mencegah eksploitasi data dan kegagalan tagihan, sistem menerapkan validasi transisi paket:

### 3.1 Peningkatan Paket (Upgrade Flow)
*   **Pro-rata**: Sistem menghitung sisa hari pada siklus tagihan berjalan dan memotong biaya paket baru secara proporsional.
*   **Aktivasi Instan**: Begitu Midtrans Snap Checkout berhasil mengirim callback `settlement`, kapasitas kuota karyawan dan penyimpanan tenant langsung ditingkatkan secara real-time di database.

### 3.2 Penurunan Paket (Downgrade Flow)
Sistem memblokir permintaan downgrade jika kapasitas riil saat ini melebihi batas paket tujuan:
*   *Audit Karyawan*: Jika saat ini terdapat 32 karyawan aktif pada skema tenant, pengajuan downgrade ke paket *Essential* (maks 25 karyawan) diblokir secara otomatis. HR wajib menonaktifkan 7 karyawan terlebih dahulu.
*   *Audit Penyimpanan*: Jika penggunaan file media saat ini adalah 400 MB, sistem memblokir downgrade ke paket *Essential* (maks 250 MB) sampai admin menghapus dokumen/kuitansi lama untuk mereduksi ukuran penyimpanan di bawah 250 MB.

---

## ⚙️ 4. Kebijakan Keuangan & Diskon
*   **Diskon Tahunan**: Pembayaran langsung di muka untuk periode 12 bulan mendapatkan potongan harga sebesar **20%** dari total tarif bulanan.
*   **Masa Uji Coba (Trial)**: Setiap pendaftaran tenant baru mendapatkan masa uji coba gratis paket *Essential* selama **14 hari** tanpa perlu memasukkan kartu kredit.
