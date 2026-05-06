# harikerja HRMS SaaS Backend (Django)

Inti API yang krusial bagi misi ekosistem **harikerja HRMS**. Dibangun dengan Python 3.12 dan Django, backend ini menggunakan arsitektur multi-tenant yang kuat dengan isolasi tingkat skema untuk memastikan keamanan dan kinerja maksimum bagi klien perusahaan.

## 🚀 Fitur Utama

- **Pondasi Multi-Tenant**: Isolasi data lengkap menggunakan `django-tenants` dan skema PostgreSQL.
- **Alur Pendaftaran Otomatis**: Sistem permintaan pendaftaran publik dengan alur kerja persetujuan admin internal yang menyediakan tenant secara otomatis.
- **Identitas Terpadu (Admin-Karyawan)**: API profil pengguna terintegrasi (`/api/users/me/`) yang menghubungkan pengguna Django dengan catatan karyawan HR mereka.
- **Mesin Penggajian Indonesia**: Kepatuhan penuh dengan peraturan **TER 2024 PPh 21**, perhitungan BPJS, dan pembuatan slip gaji PDF dinamis.
- **Kehadiran Biometrik**: Clock-in/out yang divalidasi geofencing dengan pelacakan referensi wajah dan metadata pemeriksaan keaslian (liveness check).
- **Pelaporan Komprehensif**: Ekspor CSV/PDF standar untuk rekap Kehadiran, ringkasan Penilaian (Appraisal), dan data Penggajian.
- [x] **HR Strategis**: Pelacakan KPI, siklus Penilaian, dan alur kerja persetujuan multi-tahap.
- [x] **Manajemen Profil ESS**: API mandiri terbatas yang memungkinkan karyawan memperbarui info kontak pribadi dan mengunggah dokumen KTP/NPWP tanpa mengganggu data utama HR.
- [x] **SaaS Tiering & Gating**: Logika tingkat model untuk pengaktifan fitur berbasis rencana (Essential, Professional, Premium, Enterprise).
  
  | Fitur | **FREE** | **ESSENTIAL** | **PROFESSIONAL** | **PREMIUM** | **ENTERPRISE** |
  | :--- | :---: | :---: | :---: | :---: | :---: |
  | **Kuota** | 10 Kry | 50 Kry | 100 Kry | 500 Kry | 2.000+ |
  | **Payroll** | ❌ | ❌ | ✅ | ✅ | ✅ |
  | **Kinerja**| ❌ | ❌ | ❌ | ✅ | ✅ |
  | **Analitik** | ❌ | ❌ | ❌ | ❌ | ✅ |
- [x] **Penyimpanan Cloud-Native**: Siap untuk Amazon S3 atau penyimpanan yang kompatibel dengan AWS melalui `django-storages` untuk skalabilitas multi-node.

## 📁 Modul Inti

- `tenants/`: Mengelola pendaftaran pelanggan, perutean domain, migrasi skema, dan **Modular Tiering**.
- `users/`: Otentikasi terpusat dan manajemen identitas.
- `core/`: Data master HR dasar (Departemen, Peran, Catatan Karyawan) dan **Log Audit**.
- `attendance/`: Penjadwalan, Geofencing, dan log kehadiran Biometrik.
- `payroll/`: Komponen gaji, mesin pajak TER 2024, dan manajemen slip gaji.
- `performance/`: Pelacakan strategi KPI dan siklus Penilaian.
- `reimbursement/`: Persetujuan multi-tahap untuk klaim biaya.

## 🛠 Prasyarat

- **Python**: 3.12+
- **PostgreSQL**: 14+ (Diperlukan untuk dukungan skema)
- **Redis**: Untuk caching dan pekerjaan latar belakang (opsional untuk pengembangan lokal)

---

## 📦 Memulai

### 1. Pengaturan & Instalasi
```bash
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Inisialisasi Database
Sistem menggunakan proses migrasi dua langkah untuk multi-tenancy:
```bash
python manage.py migrate_schemas --shared
python manage.py migrate_schemas --tenant
python manage.py bootstrap_tenants
```

## 🚀 Menjalankan Platform

### Mulai Server Pengembangan
```bash
node scripts/run_dev.mjs
```

**Verifikasi Backend**:
- **Status API**: [http://localhost:8000/api/users/me/](http://localhost:8000/api/users/me/)
- **Dokumentasi Swagger**: [http://localhost:8000/api/schema/swagger-ui/](http://localhost:8000/api/schema/swagger-ui/)

## 🌐 Penyebaran & Infrastruktur

Platform harikerja mengikuti jalur promosi 4-tingkat yang ketat:

| Tingkat | Domain | Penyedia Hosting | Tujuan |
| :--- | :--- | :--- | :--- |
| **Dev** | `localhost` | Docker Lokal | Prototyping cepat & tes lokal. |
| **QA** | `harikerja.web.id` | **Biznet / IDCH / Hostinger** | UAT fungsional dan pengujian QA. |
| **Staging** | `harikerja.my.id` | **Biznet / Bare-Metal** | Tes penskalaan 100 ribu pengguna. |
| **Production** | `harikerja.com` | **Biznet (100K) / AWS (1M)** | Beban kerja perusahaan resmi. |

## 🧪 Standar Pengujian

Backend menggunakan `pytest` dengan **tingkat kelulusan 100%** di **340 tes krusial** (321 Unit + 19 E2E).

**Jalankan tes logika/unit:**
```bash
node scripts/run_unit_tests.mjs
```

**Jalankan tes E2E:**
```bash
node scripts/run_e2e_tests.mjs
```

**Jalankan Semua Tes (Unit + E2E):**
```bash
node scripts/run_tests.mjs
```

## 📚 Dokumentasi Teknis

Untuk rincian teknis yang mendalam, silakan merujuk ke dokumentasi di seluruh platform di direktori `docs/` akar:
- [**Panduan Arsitektur**](../docs/architecture/)
- [**Strategi Bisnis**](../docs/business_strategy/)
- [**Alur Kerja & Fitur**](../docs/workflows_features/)
- [**Spesifikasi Teknis**](../docs/technical_specs/)

---
**Status Proyek**: 🏆 **Platform Gold Release v1.3.0 (31 Maret 2026)**. Cetak Biru Skalabilitas & Inti Backend Terstandardisasi.
**Catatan Branding**: Proyek ini diubah namanya dari Antigravity menjadi **harikerja** pada 16 Maret 2026.
