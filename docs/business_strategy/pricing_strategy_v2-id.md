# Strategi Penetapan Harga SaaS HRMS (v2.0)

Dokumen ini menguraikan model penetapan harga modern yang diusulkan untuk platform **harikerja HRMS**. Strategi ini berfokus pada **Freemium Acquisition** untuk menangkap pasar UMKM mikro sambil menyediakan sistem **Kuota Elastis** yang skalabel untuk perusahaan yang sedang berkembang.

---

## 💎 1. Tingkatan Langganan (Berbasis Fitur)

Penetapan harga kami tetap berfokus pada **Tingkatan Berbasis Nilai**. Pelanggan meningkatkan paket untuk membuka modul berdampak tinggi seperti Penggajian dan Manajemen Kinerja.

| Paket | Target Audiens | Kapasitas Dasar | Harga (Bulanan) | Modul Utama yang Disertakan |
| :--- | :--- | :--- | :--- | :--- |
| **FREE** | UMKM Mikro / Startup | **10 Karyawan** | **Rp 0** | HR Inti, Kehadiran Dasar |
| **ESSENTIAL** | Bisnis Kecil | **50 Karyawan** | **Rp 250.000** | Kehadiran + Geofencing, Cuti |
| **PROFESSIONAL** | Organisasi Menengah | **100 Karyawan** | **Rp 750.000** | **Penggajian Indonesia (PPh 21/BPJS)**, Reimbursement |
| **PREMIUM** | Perusahaan Pertumbuhan Tinggi | **500 Karyawan** | **Rp 1.500.000** | Manajemen Kinerja, KPI, RBAC Lanjutan |
| **ENTERPRISE** | Organisasi Inti | **2.000+** | **Hubungi Kami** | Suite Lengkap + Analitik, Audit, SLA Khusus |

---

## 🧩 2. Kuota Elastis (Blok Tambahan)

Alih-alih memaksa perusahaan untuk melompat ke tingkatan yang jauh lebih tinggi (dan mahal) hanya untuk beberapa karyawan tambahan, kami menawarkan **Tambahan Kapasitas**. Ini memastikan perkembangan biaya yang mulus bagi klien.

### 2.1 Harga Unit (Per Blok 10 Karyawan)
Unit dasar untuk pembelian kuota tambahan adalah blok **10 Karyawan**.

| Paket Induk | Harga per Blok (+10) | Harga per Karyawan (pax) |
| :--- | :--- | :--- |
| **ESSENTIAL** | **Rp 50.000** | Rp 5.000 |
| **PROFESSIONAL** | **Rp 100.000** | Rp 10.000 |
| **PREMIUM** | **Rp 150.000** | Rp 15.000 |

### 2.2 Opsi Pembelian yang Tersedia (UI)
Meskipun unit dasarnya adalah 10, pelanggan dapat memilih paket-paket ini di Dasbor Penagihan untuk checkout yang lebih cepat:
*   **Kecil**: +10 Karyawan
*   **Menengah**: +20 Karyawan
*   **Besar**: +50 Karyawan (Direkomendasikan untuk Premium)
*   **Enterprise**: +100 Karyawan

### 2.3 Batasan & Aturan (Ditegakkan oleh Sistem)
*   **Kapasitas Maksimum**: 
    *   **Essential**: Maksimal **100** total karyawan (Dasar 50 + 5 Tambahan).
    *   **Professional**: Maksimal **1.000** total karyawan (Dasar 100 + 90 Tambahan).
    *   **Premium**: Tidak terbatas (Tidak ada batas keras untuk tambahan).
    
> [!IMPORTANT]
> **Penegakan Batas Keras (Hard Cap)**: Sistem akan memblokir pembelian tambahan lebih lanjut jika total kapasitas mencapai batas tingkatan tersebut. Tenant harus meningkatkan ke tingkatan berikutnya untuk menambah jumlah karyawan di luar batas ini.

### 2.4 Tambahan Penyimpanan (Kuota Elastis)
Tenant yang memerlukan lebih banyak ruang untuk dokumen karyawan atau catatan penggajian dapat memperluas penyimpanan mereka tanpa meningkatkan paket dasar mereka.

| Jenis Tambahan | Ukuran Blok | Harga (Bulanan) |
| :--- | :--- | :--- |
| **Extra Storage** | **1 GB** | **Rp 50.000** |

*   **Logika**: Penyimpanan tambahan ditambahkan ke batas penyimpanan tingkatan dasar.
*   **Penagihan**: Pro-rata jika dibeli di tengah siklus (mengikuti standar Midtrans).
*   **Aksesibilitas**: Segera tersedia setelah pembayaran diselesaikan.

> [!NOTE]
> **Mengapa ada perbedaan harga?**
> Biaya tambahan mencerminkan kompleksitas operasional dari fitur-fitur tersebut. Seorang karyawan **Professional** membutuhkan biaya lebih besar untuk didukung karena sistem melakukan perhitungan pajak otomatis (PPh 21) dan jaminan sosial (BPJS) untuk mereka.

---

## 📈 3. Diskon & Komitmen

*   **Penagihan Tahunan**: **Diskon 20%** (Dapatkan 12 bulan seharga 10 bulan).
*   **Diskon Non-Profit**: **Diskon 15%** untuk LSM dan Yayasan terdaftar.
*   **Referral Startup**: Referensikan perusahaan lain dan dapatkan **gratis 1 bulan** pada perpanjangan berikutnya.

---

## 🚦 4. Status Langganan & Penegakan

Sistem secara otomatis memantau dan menegakkan status-status berikut:

1.  **ACTIVE**: Akses modul penuh sesuai dengan tingkatan yang dibeli.
2.  **EXPIRED (Masa Tenggang)**:
    *   Berlangsung selama **14 hari** setelah tanggal jatuh tempo.
    *   Akses menjadi **Baca-Saja** (Dasbor, Laporan, dan data Karyawan hanya-baca).
    *   Tidak diperbolehkan Check-in baru atau menjalankan Penggajian.
3.  **SUSPENDED**:
    *   Akses diblokir sepenuhnya.
    *   Data tenant disimpan selama **90 hari** sebelum penghapusan permanen.
    *   Hanya "Ekspor Data Darurat" yang tersedia.

---

## 🛠️ 5. Peta Jalan Implementasi Teknis

1.  **Pembaruan Model**: Tambahkan `plan_type='FREE'` ke pilihan model `Tenant`.
2.  **Pembaruan Logika**: Perbarui metode `save()` di `tenants/models.py` untuk secara otomatis menyediakan kuota untuk tingkatan Free yang baru.
3.  **API Checkout**: Perbarui `BillingViewSet` untuk menangani pembelian "Blok Tambahan" sebagai jenis faktur terpisah.
4.  **Pemeriksaan Kapasitas**: Sempurnakan `EmployeeViewSet.create` untuk memeriksa `current_employees < (base_limit + purchased_addons)`.
5.  **Isolasi Penyimpanan**: Terapkan folder terisolasi tenant (`media/<schema_name>/`).
6.  **Kuota Penyimpanan**: Terapkan pelacakan `storage_used_bytes` dan blokir unggahan yang melebihi `total_storage_capacity_mb`.

---
**Status**: Diusulkan / Sedang Ditinjau
**Tanggal Draf**: 17 April 2026
