# Rencana Langganan Tenant

Dokumen ini memberikan tinjauan komprehensif tentang rencana langganan yang tersedia dalam platform HRMS. Setiap rencana dirancang untuk memenuhi skala bisnis dan persyaratan operasional yang berbeda, dengan pembatasan modul spesifik dan kuota sumber daya.

## 1. Tinjauan Rencana
Sistem menawarkan lima tingkatan berbeda untuk mendukung organisasi dari startup hingga perusahaan besar:

1.  **FREE**: Paket tingkat awal untuk UMKM mikro dan startup.
2.  **ESSENTIAL**: Paket standar untuk bisnis kecil yang membutuhkan manajemen kehadiran dan cuti.
3.  **PROFESSIONAL**: Paket berorientasi pertumbuhan termasuk Penggajian Indonesia (PPh 21/BPJS) dan reimbursement.
4.  **PREMIUM**: Paket pertumbuhan tinggi dengan manajemen kinerja dan pelacakan KPI.
5.  **ENTERPRISE**: Paket utama yang menyediakan akses suite lengkap, analitik tingkat lanjut, dan SLA khusus.

## 2. Matriks Perbandingan Fitur & Kuota

| Fitur / Manfaat | **FREE** | **ESSENTIAL** | **PROFESSIONAL** | **PREMIUM** | **ENTERPRISE** |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Harga (IDR)** | **Rp 0** | **Rp 250.000 /bln** | **Rp 750.000 /bln** | **Rp 1.500.000 /bln** | **Hubungi Kami** |
| **Siklus Penagihan** | N/A | Tahunan Saja | Bulanan/Tahunan | Bulanan/Tahunan | Kustom |
| **Batas Karyawan** | 10 | 50 | 100 | 500 | 2.000+ |
| **Batas Penyimpanan** | **50 MB** | **250 MB** | **1 GB** | **5 GB** | **20 GB+** |
| **Data Karyawan (Inti)** | ✅ Dasar | ✅ Dasar | ✅ Lanjutan | ✅ Lanjutan | ✅ Lanjutan |
| **Kehadiran** | ✅ Dasar | ✅ Geofencing | ✅ Geofencing & Foto | ✅ Koreksi | ✅ Lanjutan (Shift) |
| **Cuti & Izin** | ❌ Tidak Tersedia | ✅ Standar | ✅ Multi-tahap | ✅ Multi-tahap | ✅ Multi-tahap |
| **Penggajian** | ❌ Tidak Tersedia | ❌ Tidak Tersedia | ✅ PPh 21 & BPJS | ✅ Bonus & Pinjaman | ✅ Analitik Penggajian |
| **Reimbursement** | ❌ Tidak Tersedia | ❌ Tidak Tersedia | ✅ Standar | ✅ Alur Kerja Persetujuan | ✅ Pelacakan Lanjutan |
| **Kinerja** | ❌ Tidak Tersedia | ❌ Tidak Tersedia | ❌ Tidak Tersedia | ✅ KPI & Peninjauan | ✅ Analitik & Coaching |
| **Keamanan & Audit** | ❌ Tidak Tersedia | ❌ Tidak Tersedia | ❌ Tidak Tersedia | ✅ RBAC Lanjutan | ✅ Jejak Audit |

---

## 3. Implementasi Teknis (Module Gating)

Akses fitur ditegakkan melalui mesin pembatasan modul sistem. Mengaktifkan rencana secara otomatis menyediakan set modul berikut:

*   **FREE:** `['core', 'attendance_basic']`
*   **ESSENTIAL:** `['core', 'attendance', 'leaves']`
*   **PROFESSIONAL:** `['core', 'attendance', 'leaves', 'payroll', 'reimbursement']`
*   **PREMIUM:** `['core', 'attendance', 'leaves', 'payroll', 'reimbursement', 'performance', 'rbac']`
*   **ENTERPRISE:** Akses ke semua modul inti, termasuk `analytics` dan `audit`.

## 4. Penyimpanan & Isolasi Data
Dengan implementasi terbaru dari **Isolasi Penyimpanan Tenant**, keamanan data dan manajemen kuota ditangani secara mendalam:
*   **Folder Terisolasi**: Setiap tenant memiliki direktori fisik khusus (`media/<schema_name>/`).
*   **Pelacakan Mendalam**: Batas penyimpanan mencakup semua unggahan sistem termasuk Foto Profil, Scan KTP/NPWP, Kuitansi Reimbursement, dan Foto Kehadiran.
*   **Penegakan Kuota**:
    *   **PERINGATAN (90%)**: Sistem memicu peringatan dalam aplikasi kepada administrator.
    *   **KRITIS (100%)**: Unggahan file baru diblokir sementara hingga kuota diperluas atau file dibersihkan.
*   **Kuota Elastis (Add-on)**: Tenant dapat membeli penyimpanan tambahan dalam kelipatan 1 GB tanpa perlu meningkatkan seluruh rencana langganan mereka.

## 5. Penagihan & Kepatuhan Langganan

Struktur rencana kami dibangun khusus dengan mempertimbangkan pasar Indonesia:
1.  **Kepatuhan Utama**: Dukungan BPJS dan PPh 21 (TER 2024) sudah terpasang untuk semua pengguna Professional ke atas.
2.  **Kuota Skalabel**: Batas karyawan yang murah hati yang tumbuh bersama bisnis Anda, hingga dukungan enterprise tak terbatas.
3.  **Integritas Otomatis**: Didukung oleh **Midtrans Payment Gateway** untuk perpanjangan yang mulus dan kepatuhan keamanan tinggi.
4.  **Masa Tenggang**: Semua rencana mencakup masa tenggang 14 hari setelah kedaluwarsa sebelum memasuki mode **Ditangguhkan (Blokir)**.

---

**Terakhir Diperbarui**: 17 April 2026
**Status**: Aktif (Otomatisasi Perpanjangan Sedang Berlangsung)
