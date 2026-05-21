# harikerja HRMS Mobile (Flutter)

Aplikasi employee self-service (ESS) untuk ekosistem **harikerja HRMS**. Aplikasi Flutter ini menyediakan portal aman bertenaga biometrik bagi karyawan untuk mengelola kehadiran, jadwal kerja, dan penggajian mereka.

## 📱 Fitur Utama

- **Pengenalan Wajah Biometrik**: Verifikasi kehadiran bertenaga AI dengan pemeriksaan keaslian (liveness check) menggunakan Google ML Kit.
- **Geofencing Cerdas**: Validasi GPS akurasi tinggi untuk memastikan catatan kehadiran berada dalam batas kantor.
- **Identitas Terintegrasi**: Sinkronisasi waktu nyata dengan sistem identitas backend terpadu (NIK Karyawan, Peran, Departemen).
- **Manajemen Profil ESS**: Portal mandiri untuk memperbarui info kontak dan mengunggah dokumen KTP/NPWP.
- **Koreksi Kehadiran**: Alur kerja permintaan untuk memperbaiki log yang terlewat atau salah langsung dari aplikasi mobile.
- **Kinerja Strategis**: Dasbor KPI pribadi dengan visualisasi kemajuan dan pengajuan penilaian mandiri (self-appraisal).
- **Shift & Jadwal**: Kalender kerja pribadi dengan status shift waktu nyata.
- **Slip Gaji Dinamis**: Lihat dan unduh rincian penggajian dengan data kepatuhan TER 2024.
- **Manajemen Cuti**: Ajukan permintaan cuti (Tahunan, Izin, Sakit) dan lacak saldo secara waktu nyata.
- **Klaim Reimbursement**: Pengajuan biaya mudah dengan validasi berbasis kategori dan pelacakan status.
- **Pengaturan Akun**: Personalisasi aplikasi, preferensi bahasa, dan manajemen logout yang aman.

### 📊 Status & Kematangan Fitur

Untuk audit mendalam tentang fitur yang diimplementasikan vs fitur tiruan (mocked), lihat [**Audit Fitur & Analisis Kesenjangan**](../docs/project_management/mobile_feature_audit-id.md) ([**English Version**](../docs/project_management/mobile_feature_audit.md)).

| Modul            | Status       | Dinamis? |
| :--------------- | :----------- | :------- |
| Auth & Face ID   | ✅ Siap      | Ya       |
| Profil & Dokumen | ✅ Siap      | Ya       |
| Logika Kehadiran | ✅ Siap      | Ya       |
| Cuti & Reimb     | ✅ Siap      | Ya       |
| Kinerja          | ✅ Siap      | Ya       |
| Slip Gaji        | ✅ Siap      | Ya       |
| L10n             | ⚠️ Polishing | Tidak    |

### 📱 Pratinjau UI Flutter

| ![Mobile Dashboard](../docs/assets/mobile_preview.png) | ![Face ID Verification](../docs/assets/mobile_face_id.png) |

## 🛠 Tech Stack

- **Framework**: Flutter 3.19+
- **Biometrik**: Google ML Kit (Deteksi Wajah)
- **Peta/Lokasi**: API Geolocator (Akurasi Tinggi)
- **Media**: Kamera & Pemilih Gambar (Dokumen)
- **Penyimpanan**: Flutter Secure Storage (JWT)
- **Font**: Plus Jakarta Sans (Google Fonts)

---

## 📦 Memulai

### Prasyarat

- **Flutter SDK**: 3.19 atau yang terbaru.
- **Backend Berjalan**: Pastikan backend aktif di Port 8000.

### Pengaturan

```powershell
flutter pub get
```

## 🚀 Menjalankan Platform

```bash
node scripts/run_dev.mjs
```

## 📦 Membangun Aplikasi (Build Binaries)

Untuk mempermudah pembuatan file instalan, Anda dapat menggunakan script berikut:

### Android (APK)

```bash
node scripts/build_apk.mjs
```

File `.apk` akan dihasilkan di `build/app/outputs/flutter-apk/app-release.apk`.

### iOS (IPA)

```bash
node scripts/build_ipa.mjs
```

_Catatan: Build iOS membutuhkan macOS dan Xcode._

## 🌐 Penyebaran & Infrastruktur

Aplikasi menangani multi-tenancy melalui `X-Tenant-Domain` dan build lingkungan.

| Tingkat        | URL API / Domain               | Tujuan                    |
| :------------- | :----------------------------- | :------------------------ |
| **Dev**        | `http://10.0.2.2:8000/api`     | Pengembangan Lokal        |
| **QA**         | `https://harikerja.web.id/api` | Biznet / IDCH / Hostinger |
| **Staging**    | `https://harikerja.my.id/api`  | Tes Penskalaan Biznet     |
| **Production** | `https://harikerja.com/api`    | Biznet/AWS Enterprise     |

## 🧪 Standar Pengujian

Aplikasi mobile memiliki rangkaian pengujian komprehensif yang mencakup logika inti dan alur E2E dengan **tingkat kelulusan 100%** di **161 tes yang kuat**.

### Unit & Logic Tests - 138 Tes

```bash
node scripts/run_unit_tests.mjs
```

### End-to-End Testing (E2E) - 23 Tes

**Jalankan dengan API tiruan (Terisolasi):**

```bash
node scripts/run_e2e_tests.mjs
```

**Jalankan dengan API dan Database terintegrasi nyata:**

```bash
node scripts/run_e2e_tests.mjs --integrated
```

### Jalankan Semua Tes (Unit + E2E)

```bash
node scripts/run_tests.mjs
```

## 📚 Dokumentasi Teknis

Untuk rincian teknis yang mendalam, silakan merujuk ke dokumentasi di seluruh platform di direktori `docs/` akar:

- [**Arsitektur Autentikasi: Web vs. Mobile**](../docs/architecture/auth_architecture-id.md)
- [**Paket Langganan & Strategi Pricing**](../docs/business_strategy/pricing_and_plans-id.md)
- [**Alur Kerja & Diagram Alir Aplikasi Mobile**](../docs/workflows_features/mobile_app_workflows-id.md)
- [**Panduan Developer & Spesifikasi Teknis**](../docs/technical_specs/developer_guide-id.md)

---

**Status**: 🏆 **Platform Gold Release v1.3.1 (11 Mei 2026)**. Cetak Biru Skalabilitas & Pengalaman Mobile Terstandardisasi.
**Catatan Branding**: Proyek ini diubah namanya menjadi **harikerja** pada 16 Maret 2026.
