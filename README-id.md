# harikerja HRMS SaaS

Sistem Manajemen Sumber Daya Manusia (HRMS) multi-tenant generasi terbaru yang dibangun untuk skala perusahaan besar. Platform ini menyediakan rangkaian lengkap untuk manajemen SDM, pelacakan kehadiran dengan verifikasi biometrik AI, kepatuhan penggajian Indonesia (TER 2024), dan Analitik Eksekutif.

## ✨ Sorotan Platform

### Dasbor Admin Profesional

![Dashboard Preview](./docs/assets/dashboard_preview.png)

_Pusat komando modern berbasis glassmorphism untuk profesional SDM._

### Presensi Mobile Aman

<p align="center">
  <img src="./docs/assets/mobile_preview.png" width="48%" />
  <img src="./docs/assets/mobile_face_id.png" width="48%" />
</p>

_Verifikasi wajah biometrik dan ESS (Employee Self-Service) waktu nyata untuk tenaga kerja modern._

### 🛠️ Admin & Operasional

![Admin Registrations](./docs/assets/admin_registrations.png)

_Proses pendaftaran tenant dan penyediaan organisasional yang efisien._

### 📅 Penjadwalan Canggih

![Shift Management](./docs/assets/shift_management.png)

_Perencanaan shift interaktif dan orkestrasi tenaga kerja berbasis kalender._

### 💸 Alur Kerja Keuangan

![Reimbursement UI](./docs/assets/reimbursement_ui.png)

_Siklus persetujuan multi-tahap untuk klaim pengeluaran dan penggantian biaya (reimbursement)._

### 💳 Kesiapan Komersial

<p align="center">
  <img src="./docs/assets/pricing_tiers_ui.png" width="48%" />
  <img src="./docs/assets/subscription_expired_ui.png" width="48%" />
</p>

_Penyediaan SaaS bertingkat dan pembatasan langganan cerdas (Essential, Professional, Premium, Enterprise)._

### 📊 Rencana Komersial

| Fitur | **FREE** | **ESSENTIAL** | **PROFESSIONAL** | **PREMIUM** | **ENTERPRISE** |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Batas Karyawan** | 10 | 50 | 100 | 500 | 2.000+ |
| **HR Inti** | ✅ Dasar | ✅ Dasar | ✅ Lanjutan | ✅ Lanjutan | ✅ Lanjutan |
| **Kehadiran** | ✅ Dasar | ✅ Geofencing | ✅ Geo + Foto | ✅ Koreksi | ✅ Shift/Roster |
| **Penggajian** | ❌ | ❌ | ✅ PPh 21/BPJS | ✅ Lanjutan | ✅ Analitik |
| **Kinerja** | ❌ | ❌ | ❌ | ✅ KPI/Appraisal | ✅ Team Coaching |
| **Analitik** | ❌ | ❌ | ❌ | ❌ | ✅ Audit/Insight |

## 📦 Memulai

Platform ini diatur menggunakan lapisan manajemen Node.js yang terpadu.

### 🚀 Menjalankan Platform

Jalankan perintah berikut untuk memulai semua layanan (Backend, Frontend, DB, Redis) dalam mode pengembangan:

```bash
# Jalankan seluruh platform
node up.mjs dev --build

# Lihat log
node up.mjs dev logs

# Hentikan platform
node up.mjs dev down
```

### 🧪 Menjalankan Unit Tes Terpadu

Platform ini menyertakan orkestrator tes utama yang menjalankan semua tes di seluruh stack (Backend, Frontend, dan Mobile) dan menghasilkan laporan utama:

```bash
# Jalankan semua tes untuk semua modul
node scripts/run_all_tests.mjs
```

**Tes Stack Individual:**
Untuk kontrol yang lebih spesifik, Anda dapat menjalankan tes di dalam setiap direktori modul:
- [**Tes Backend**](./backend/README-id.md#🧪-standar-pengujian)
- [**Tes Frontend**](./frontend/README-id.md#🧪-standar-pengujian)
- [**Tes Mobile**](./mobile/README-id.md#🧪-standar-pengujian)

**Titik Akses (Pengembangan Lokal):**

- **Dasbor Publik**: [http://localhost:3000](http://localhost:3000)
- **Dasbor Tenant**: [http://company1.localhost:3000](http://company1.localhost:3000)
- **Dokumentasi API Backend**: [http://localhost:8000/api/schema/swagger-ui/](http://localhost:8000/api/schema/swagger-ui/)
  ![Swagger UI](./docs/assets/swagger_ui.png)

## 📁 Modul Proyek

| Modul        | Tujuan                                | Dokumentasi                         |
| :----------- | :------------------------------------ | :---------------------------------- |
| **Backend**  | Django REST API & Inti Multi-tenant   | [**README**](./backend/README-id.md) |
| **Frontend** | Dasbor Admin Premium Next.js          | [**README**](./frontend/README-id.md)|
| **Mobile**   | Aplikasi Employee Self-Service Flutter| [**README**](./mobile/README-id.md)  |

## 🚀 Fitur Utama

- **Pondasi Multi-Tenant**: Isolasi data lengkap menggunakan skema PostgreSQL per pelanggan.
- **Keamanan Biometrik**: Face ID bertenaga AI dengan pemeriksaan keaslian (liveness check) menggunakan Google ML Kit.
- **Kepatuhan Penggajian Indonesia**: Mesin penggajian yang sepenuhnya mematuhi **TER 2024 PPh 21** dan BPJS.
- **Kinerja Strategis**: Pelacakan KPI, siklus Penilaian (Appraisal), dan alur kerja persetujuan multi-tahap.
- **Manajemen Profil ESS**: Portal mandiri bagi karyawan untuk memperbarui info pribadi dan mengunggah dokumen.
- **Auto-Onboarding**: Pendaftaran mandiri siap komersial dan penyediaan skema otomatis.

## 🌐 Penyebaran & Infrastruktur

| Tingkat        | Domain                     | Platform Hosting              | Tujuan                                |
| :------------- | :------------------------- | :---------------------------- | :------------------------------------ |
| **Dev**        | `localhost`                | Docker Lokal                  | Prototyping cepat & tes lokal.        |
| **QA**         | `harikerja.web.id`      | **Biznet / IDCH / Hostinger** | UAT fungsional dan pengujian QA.      |
| **Staging**    | `harikerja.my.id` | **Biznet / Bare-Metal**       | Tes penskalaan 100 ribu pengguna.     |
| **Production** | `harikerja.com`            | **Biznet (100K) / AWS (1M)**  | Beban kerja perusahaan resmi.         |

## 🧪 Standar Pengujian

Platform ini mencapai tingkat kelulusan tes **100% terpadu** di semua lapisan stack.

- **Backend**: 348 Tes (329 Unit + 19 E2E) - Pytest.
- **Frontend**: 245 Tes (187 Unit + 58 E2E) - Vitest & Playwright.
- **Mobile**: 158 Tes (135 Unit + 23 E2E) - Flutter.

## 📈 Strategi Skalabilitas: Jalan Menuju 1 Juta Pengguna

Saat **harikerja** bertransisi dari MVP yang dikembangkan secara mandiri menjadi platform perusahaan yang krusial bagi bisnis, kami telah menetapkan peta jalan organisasi teknis yang jelas untuk memastikan uptime 99,9% dan integritas data bagi 1 juta pengguna.

### Organisasi Tim Teknis

Untuk menjamin stabilitas, kami telah menetapkan struktur **tim inti 10 orang**:

- **Pengembangan (4 Orang)**: 2 Backend (Django), 1 Frontend (Next.js), 1 Mobile (Flutter).
- **Platform & Reliabilitas (2 Orang)**: 1 DevOps/SRE, 1 Security Engineer.
- **Kualitas & Ops (4 Orang)**: 1 QA Automation, 3 Dukungan Teknis/Implementasi.

### Tahapan Transisi Strategis

1.  **Fase Saat Ini**: Kesiapan Produksi & Optimasi Kinerja (8-12 minggu)
2.  **Fase Berikutnya**: Penskalaan 1.000 - 10.000 Pengguna dengan pemantauan yang ditingkatkan
3.  **Fase Depan**: Penskalaan 100.000+ Pengguna dengan penyebaran tim lengkap 10 orang

Strategi penskalaan mendalam: [**Strategi Tim Teknis**](./docs/plans/technical_team_strategy-id.md)

## 📚 Dokumentasi Teknis

Untuk rincian teknis yang mendalam, silakan merujuk ke dokumentasi internal di seluruh platform:

- [**Checklist Fitur & Peta Jalan**](./docs/project_management/feature_roadmap_checklist-id.md) - Daftar lengkap fitur yang ada dan rencana masa depan
- [**Arsitektur High Availability AWS**](./docs/architecture/aws_high_availability_architecture-id.md) - Desain penskalaan 1 juta pengguna
- [**Panduan Arsitektur Skalabilitas**](./docs/architecture/scaling_architecture_guide-id.md) - Penskalaan 100 ribu ke 1 juta (AWS vs VPS)

## 🛠 Tech Stack

- **Backend**: Python 3.12+, Django 5.2, Django-Tenants, DRF.
- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS, Framer Motion.
- **Mobile**: Flutter 3.19+, Dart, Google ML Kit (Biometrik).
- **Infrastruktur**: PostgreSQL 15, Redis 7, PgBouncer, AWS (EKS/RDS/S3).

---

**Status**: 🚀 **Rilis Platform Gold v1.5.0 (7 Mei 2026)**. Siap untuk Fase Kesiapan Produksi.
**Fokus Saat Ini**: Optimasi Kinerja Prioritas Tinggi & Penguatan Keamanan (Fase P5).
