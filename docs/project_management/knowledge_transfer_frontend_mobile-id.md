# Dokumen Transfer Pengetahuan - Stack Frontend & Mobile

Dokumen ini memberikan tinjauan komprehensif tentang teknologi, fitur, dan integrasi API yang digunakan dalam aplikasi Frontend (Web) dan Mobile harikerja HRMS.

---

## 🌐 Aplikasi Frontend (Web)

### 🛠 Stack Teknologi
- **Framework**: [Next.js](https://nextjs.org/) (v16.2.4) menggunakan App Router.
- **Library**: [React](https://reactjs.org/) (v19.2.3).
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (v4) untuk tata letak dan desain, [Framer Motion](https://www.framer.com/motion/) untuk animasi.
- **Internasionalisasi**: `next-intl` untuk dukungan multi-bahasa (ID, EN).
- **Ikon**: `lucide-react`.
- **Grafik**: `recharts` untuk analitik dasbor.
- **Manajemen Status**: React Context API (`AuthContext`, `TenantContext`).
- **Pengambilan Data**: Native `fetch` dengan pembungkus kustom (`apiFetch`) di `src/lib/api.ts`.
- **Pengujian**: Vitest (Unit/Integrasi), Playwright (E2E).

### 🚀 Fitur Utama
1. **Dasbor Multi-Tenant**: Ringkasan statistik perusahaan (Total karyawan, kehadiran, cuti tertunda).
2. **Manajemen Karyawan**: Direktori, tampilan profil, dan manajemen (Hanya untuk Staf).
3. **Manajemen Kehadiran**: Memantau log, shift, jadwal, dan log audit.
4. **Cuti & Alur Kerja**: Sistem persetujuan untuk permintaan cuti dan alur kerja kantor lainnya.
5. **Penggajian**: Membuat dan melihat slip gaji, mengelola periode penggajian.
6. **Kinerja**: Pelacakan KPI dan peninjauan penilaian karyawan.
7. **Reimbursement**: Mengelola klaim biaya dan kategori.
8. **Portal Admin**: Pendaftaran tenant dan pengaturan seluruh sistem (Superadmin).
9. **Branding & Pengaturan**: Menyesuaikan logo perusahaan, warna, dan konfigurasi umum.

### 🔌 Penggunaan Endpoint API (Frontend)

| Fitur | Endpoint | Metode | Tujuan |
|---------|----------|--------|---------|
| **Auth** | `/auth/login/` | POST | Login dan menerima token JWT. |
| **Auth** | `/auth/token/refresh/` | POST | Menyegarkan token akses yang kedaluwarsa. |
| **Profil** | `/users/me/` | GET | Mengambil rincian pengguna yang sedang login. |
| **Dasbor** | `/core/dashboard-stats/` | GET | Mengambil data statistik untuk grafik dan kartu. |
| **Karyawan** | `/employees/` | GET/POST | Mencantumkan dan membuat karyawan. |
| **Kehadiran** | `/attendance/` | GET | Melihat log kehadiran. |
| **Kehadiran** | `/attendance/corrections/` | GET/POST | Mengelola permintaan koreksi kehadiran. |
| **Cuti** | `/leave-requests/` | GET/POST | Mengelola pengajuan cuti dan persetujuan. |
| **Penggajian** | `/payslips/` | GET | Melihat slip gaji karyawan. |
| **Kinerja** | `/appraisals/` | GET/POST | Mengelola penilaian kinerja. |
| **Pengaturan** | `/settings/branding/` | GET/POST | Memperbarui branding perusahaan (Logo, warna). |

---

## 📱 Aplikasi Mobile

### 🛠 Stack Teknologi
- **Framework**: [Flutter](https://flutter.dev/) (SDK >=3.0.0).
- **Klien API**: Paket `http` dengan `ApiService` kustom.
- **Penyimpanan**: `flutter_secure_storage` (token JWT), `shared_preferences` (Pengaturan).
- **Geolokasi**: `geolocator` untuk kehadiran berbasis lokasi.
- **Kamera & AI**: `camera` dan `google_mlkit_face_detection` untuk verifikasi wajah.
- **UI**: Material Design 3, `google_fonts`.
- **Pengujian**: Flutter Test, Integration Test (E2E).

### 🚀 Fitur Utama
1. **Kehadiran dengan Face ID**: Clock-in/out menggunakan GPS dan Pengenalan Wajah.
2. **Profil Mandiri (Self-Service)**: Melihat dan mengedit info pribadi, mengunggah dokumen (KTP/NPWP).
3. **Manajemen Cuti**: Mengajukan cuti dan memeriksa status/saldo.
4. **Reimbursement**: Mengajukan klaim biaya dengan unggahan kuitansi.
5. **Penampil Slip Gaji**: Mengunduh dan melihat slip gaji bulanan (PDF/DOCX).
6. **Dasbor Kinerja**: Melacak KPI sendiri dan mengirimkan penilaian mandiri.
7. **Jadwal & Shift**: Melihat jadwal kerja yang ditugaskan dan meminta koreksi.

### 🔌 Penggunaan Endpoint API (Mobile)

| Fitur | Endpoint | Metode | Tujuan |
|---------|----------|--------|---------|
| **Auth** | `/auth/login/` | POST | Login dengan email, kata sandi, dan subdomain tenant. |
| **Kehadiran** | `/attendance/` | POST | Mengirim clock-in/out dengan koordinat. |
| **Verifikasi Wajah** | `/attendance/verify-face/` | POST | Memverifikasi wajah pengguna saat clock-in (jika diaktifkan). |
| **Profil** | `/employees/{id}/` | PATCH | Memperbarui rincian profil atau mengunggah dokumen. |
| **Cuti** | `/leave-requests/` | GET/POST | Mengajukan cuti dan melihat riwayat. |
| **Cuti** | `/leave-balances/` | GET | Mendapatkan sisa kuota cuti. |
| **Reimbursement** | `/reimbursements/` | GET/POST | Mengajukan klaim biaya. |
| **Penggajian** | `/payslips/` | GET | Mencantumkan slip gaji yang tersedia. |
| **Penggajian** | `/payslips/{id}/download_pdf/` | GET | Mengunduh slip gaji tertentu sebagai PDF. |
| **Kinerja** | `/kpi-targets/` | GET | Melihat target kinerja yang ditugaskan. |
| **Koreksi** | `/attendance-corrections/` | GET/POST | Meminta koreksi data kehadiran. |

---

## ⚙️ Sistem Inti Umum

### 🔐 Alur Otentikasi
1. **Login**: Pengguna memberikan kredensial + ID Tenant (di mobile) atau Subdomain (di web).
2. **Token**: Backend mengembalikan token `access` (berumur pendek) dan `refresh` (berumur panjang).
3. **Penyimpanan**: Web menggunakan `localStorage`, Mobile menggunakan `FlutterSecureStorage`.
4. **Interseptor**: Kedua stack memiliki logika untuk secara otomatis melampirkan header `Authorization: Bearer <token>` dan menangani kesalahan 401 dengan mencoba penyegaran token.

### 🏢 Penanganan Multi-Tenant
Aplikasi menggunakan **Multi-tenancy berbasis Domain**.
- **Web**: Mengidentifikasi tenant dari hostname (misal, `client1.harikerja.com`).
- **Mobile**: Pengguna memasukkan nama tenant saat login, disimpan dan dikirim melalui header `X-Tenant-Domain` atau `Host`.
- **Header**: Backend mengidentifikasi skema melalui header `Host` atau header kustom `X-Tenant`.

### 🌍 Internasionalisasi (i18n)
- **Web**: Ditangani melalui `next-intl` dengan pesan JSON di `frontend/messages/`.
- **Mobile**: Ditangani melalui paket `intl` Flutter dengan file ARB di `mobile/lib/l10n/`.
- **Bahasa yang Didukung**: Bahasa Indonesia (ID) dan Bahasa Inggris (EN).

---

## 📋 Daftar Periksa Transfer Pengetahuan
- [ ] Pahami pembungkus `apiFetch` (Web) dan `ApiService` (Mobile).
- [ ] Biasakan diri dengan persyaratan header `X-Tenant` untuk semua permintaan.
- [ ] Jelajahi arsitektur berbasis komponen di `frontend/src/components/`.
- [ ] Tinjau alur layar di `mobile/lib/screens/`.
- [ ] Periksa `docs/api_reference.md` untuk rincian skema permintaan/respons.
