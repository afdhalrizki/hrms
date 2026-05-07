# Panduan Pengembang Full Stack harikerja

Selamat datang di tim pengembangan harikerja! Panduan ini menyediakan semua yang Anda butuhkan untuk membangun, menguji, dan menyebarkan fitur di seluruh stack Backend (Django), Frontend (Next.js), dan Mobile (Flutter) kami.

---

## 🛠 Prasyarat & Pengaturan

### 1. Persyaratan
- **Runtime**: Node.js 20+, Python 3.12+, SDK Flutter 3.0+
- **Database**: PostgreSQL 14+, Redis 7+
- **Alat**: Docker & Docker Compose

### 2. Pengaturan Lokal Cepat
Kami menggunakan `up.mjs` sebagai alat orkestrasi utama kami. Alat ini mengotomatiskan pemeriksaan lingkungan, penginstalan dependensi, dan memulai layanan.

```bash
# Jalankan semuanya (Backend + Frontend) dengan data pengujian
node up.mjs --seed

# Opsi:
# --skip-docker : Gunakan DB lokal alih-alih Docker
# --coverage    : Aktifkan pelacakan cakupan pengujian
# --workers=N   : Atur jumlah pekerja pengujian paralel
```

---

## 🏗 Arsitektur Proyek

### 🛡 Backend (Django) - `/backend`
- **Multi-Tenancy**: Didukung oleh `django-tenants` (Database Bersama, Skema Terisolasi).
- **API**: Django REST Framework (DRF).
- **Auth**: JWT melalui `rest_framework_simplejwt`.
- **RBAC**: Sistem izin kustom di `core.permissions`.

### 🌐 Frontend (Web) - `/frontend`
- **Framework**: Next.js 16 (App Router).
- **Styling**: Tailwind CSS v4 + Framer Motion.
- **I18n**: `next-intl` (Bahasa Inggris & Bahasa Indonesia).
- **API Fetching**: Pembungkus `apiFetch` kustom di `src/lib/api.ts` menangani konteks tenant dan penyegaran token.

### 📱 Mobile (App) - `/mobile`
- **Framework**: Flutter.
- **Fitur Inti**: Geofencing, Deteksi Wajah (MLKit), Unggah Dokumen.
- **Klien API**: `ApiService` terpusat di `lib/api/api_service.dart`.

---

## 🚀 Menambahkan Fitur Baru (Full Stack)

### Langkah 1: Model Backend & API
1. Buat aplikasi baru: `python manage.py startapp <nama_fitur>`
2. Tambahkan ke `TENANT_APPS` di `config/settings.py`.
3. Warisi dari `AuditModel` untuk pelacakan perubahan otomatis.
4. Terapkan `TenantIsolationMixin` di ViewSet Anda.

### Langkah 2: Implementasi Frontend
1. Tambahkan rute baru di `src/app/[locale]/<nama_fitur>/page.tsx`.
2. Gunakan `apiFetch` untuk berinteraksi dengan backend.
3. Tambahkan terjemahan di `messages/id.json` dan `messages/en.json`.

### Langkah 3: Implementasi Mobile
1. Tambahkan layar baru di `lib/screens/`.
2. Tambahkan metode endpoint yang sesuai di `ApiService`.
3. Daftarkan rute di `main.dart`.

---

## 🧪 Panduan Pengujian

### Pengujian Backend (Pytest)
```bash
cd backend
pytest --cov=.
```

### Pengujian Frontend (Vitest & Playwright)
```bash
cd frontend
npm run test      # Unit/Integrasi
npx playwright test # E2E
```

### Pengujian Mobile
```bash
cd mobile
flutter test
```

### Rangkaian Tes Terintegrasi
Untuk menjalankan semua tes (Backend + Frontend + E2E) secara bersamaan:
```bash
node up.mjs --integrated
```

---

## 🏢 Pengembangan Multi-Tenant
Sistem mengidentifikasi tenant berdasarkan **hostname**.
- **Dev Lokal**: `localhost` (Publik), `client1.localhost:3000` (Tenant).
- **Header**: Gunakan `X-Tenant-Domain` pada Mobile atau `X-Tenant` dalam tes E2E untuk menentukan konteks.

---

## 🔐 Keamanan & Praktik Terbaik
- **Jangan pernah** melakukan hardcode ID tenant; selalu turunkan dari `request.tenant`.
- Gunakan **Services** untuk logika bisnis; buat Model dan View tetap ringkas.
- Selalu terapkan **RBAC** dengan mengatur `required_rbac_permission` di ViewSet.
- Gunakan **Select Related / Prefetch Related** untuk menghindari masalah kueri N+1.

---

**Terakhir Diperbarui**: 7 Mei 2026  
**Status**: Aktif  
**Orkestrasi**: `node up.mjs`
