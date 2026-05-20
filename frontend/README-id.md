# harikerja HRMS SaaS Frontend (Next.js)

Dasbor admin premium berkinerja tinggi untuk ekosistem **harikerja HRMS**. Dibangun dengan Next.js 16 dan TypeScript, mengikuti pola App Router terbaru untuk SEO dan pengalaman pengguna yang optimal.

## ✨ Fitur Kelas Atas

- **Pengalaman Multi-Tenant**: Deteksi tenant otomatis melalui penguraian subdomain dan branding ruang kerja.
- **Manajemen Kehadiran**: Pelacakan waktu nyata dari check-in karyawan, status geofencing, dan permintaan koreksi.
- **Alur Kerja & Persetujuan**: Sistem persetujuan multi-tahap untuk cuti, lembur, dan reimbursement dengan tahapan yang dapat dikonfigurasi.
- **Pemrosesan Gaji**: Pembuatan slip gaji otomatis dengan kepatuhan TER 2024 dan manajemen komponen gaji.
- **Penilaian Kinerja**: Pelacakan kinerja berbasis KPI dan siklus peninjauan untuk semua tingkat organisasi.
- **Provisioning & RBAC**: Kontrol akses berbasis peran yang granular dan manajemen spesifik cabang untuk tim terdistribusi.
- **Dasbor Analitik**: Wawasan eksekutif tingkat tinggi tentang jumlah karyawan, tren kehadiran, dan biaya penggajian.
- **Manajemen Profil ESS**: Portal mandiri bagi karyawan untuk memperbarui info pribadi dan mengunggah dokumen (KTP/NPWP).
- **Modular Tiering & Gating**: Pembatasan fitur cerdas melalui `FeatureGuard` berdasarkan rencana langganan tenant.
- **Portal Admin Rahasia**: Pendaftar terpusat untuk mengelola pertumbuhan tenant dan konfigurasi sistem secara luas.

## 🖼 Pratinjau UI

### Dasbor Admin
![Dashboard Preview](../docs/assets/dashboard_preview.png)

*Dasbor modern berbasis glassmorphism dengan indikator analitik waktu nyata.*

### Pendaftaran Premium
![Signup Preview](../docs/assets/signup_page_premium_harikerja.png)

*Pendaftaran tenant yang mulus dengan validasi domain instan.*

### Provisioning Admin
![Provisioning Preview](../docs/assets/add_employee_modal_before_submit_1773638661925.png)

*Formulir pembuatan karyawan yang terintegrasi aman dengan kontrol RBAC organisasional.*

## 🛠 Tech Stack

- **Inti**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS & Vanilla CSS (Sistem Desain)
- **Animasi**: Framer Motion
- **Ikon**: Lucide React
- **Pengujian**: Vitest & React Testing Library

## 📁 Komponen Utama

- `src/app/`: Perutean berbasis file termasuk Pendaftaran, Login, dan Dasbor.
- `src/context/`: Manajemen status Tenant dan Auth dengan **Module Gating**.
- `src/components/`: Komponen UI yang dapat digunakan kembali termasuk `FeatureGuard` baru.
- `src/lib/`: Klien API dan pembantu utilitas.

---

## 📦 Memulai

### Instal Dependensi
```bash
npm install
```

### 🚀 Menjalankan Platform
```bash
npm run dev
```

**Verifikasi Frontend**:
- **Portal Publik**: [http://localhost:3000](http://localhost:3000)
- **Dasbor Tenant**: [http://company1.localhost:3000](http://company1.localhost:3000)

## 🌐 Penyebaran & Infrastruktur

Platform harikerja mengikuti jalur promosi 4-tingkat yang ketat:

| Tingkat | Domain | Penyedia Hosting | Tujuan |
| :--- | :--- | :--- | :--- |
| **Dev** | `localhost` | Docker Lokal | Prototyping cepat & tes lokal. |
| **QA** | `harikerja.web.id` | **Biznet / IDCH / Hostinger** | UAT fungsional dan pengujian QA. |
| **Staging** | `harikerja.my.id` | **Biznet / Bare-Metal** | Tes penskalaan 100 ribu pengguna. |
| **Production** | `harikerja.com` | **Biznet (100K) / AWS (1M)** | Beban kerja perusahaan resmi. |

## 🧪 Standar Pengujian

Frontend menggunakan strategi lapisan ganda dengan **tingkat kelulusan 100%** di **288 tes krusial**.

### Unit Testing (Vitest) - 218 Tes
```bash
node scripts/run_unit_tests.mjs
```

### End-to-End Testing (Playwright) - 70 Tes

**Jalankan dengan API tiruan (Cepat/Terisolasi):**
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
- [**Sistem Multi-Tenancy**](../docs/architecture/multi_tenancy_system-id.md)
- [**Paket Langganan & Strategi Pricing**](../docs/business_strategy/pricing_and_plans-id.md)
- [**Alur Kerja & Diagram Alir Aplikasi Web**](../docs/workflows_features/web_app_workflows-id.md)
- [**Panduan Developer & Spesifikasi Teknis**](../docs/technical_specs/developer_guide-id.md)


---
**Status**: 🏆 **Platform Gold Release v1.3.1 (11 Mei 2026)**. Cetak Biru Skalabilitas & Pengalaman Frontend Terstandardisasi.
**Catatan Branding**: Proyek ini diubah namanya menjadi **harikerja** pada 16 Maret 2026.
