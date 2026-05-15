# Dokumentasi Global Admin (SUPERADMIN)

Dokumen ini menjelaskan peran, fungsionalitas, dan konfigurasi akun **Global Admin** pada platform HRMS.

---

## 1. Apa itu Global Admin?

**Global Admin** (diidentifikasi sebagai `SUPERADMIN` pada antarmuka pengguna/frontend) adalah tingkat akun tertinggi di platform HRMS. Akun ini berada di atas tingkat organisasi (tenant) individual dan bertanggung jawab atas manajemen infrastruktur platform secara keseluruhan.

Status Global Admin ditentukan melalui properti boolean `is_global_admin` pada model `User` di backend.

---

## 2. Hubungan dengan Tenant Master (Public Schema)

Sistem HRMS ini menggunakan arsitektur *PostgreSQL Schema-Based Multi-Tenancy*.
* **Tenant Master** dilambangkan oleh skema khusus bernama **`public` schema**.
* Data global, termasuk daftar tenant, manajemen domain, dan permintaan pendaftaran tenant baru, disimpan di skema `public`.
* Kredensial login untuk Global Admin disimpan di dalam skema `public` ini.
* Hanya akun dengan status `is_global_admin` atau `is_superuser` yang diperbolehkan mengakses portal administrasi utama yang berada di bawah domain publik (diakses melalui `/en/login/portal-admin`).

---

## 3. Fungsionalitas & Hak Istimewa

### A. Bypass Pembatasan Multi-Tenant
Berdasarkan `TenantAccessMiddleware`, pengguna standar hanya dapat mengakses tenant tempat mereka terdaftar secara eksplisit. Global Admin memiliki pengecualian:
```python
# Terletak di backend/users/middleware.py
is_internal = getattr(request.user, 'is_global_admin', False) or request.user.is_superuser
if is_internal:
    return self.get_response(request)  # Bypass semua pengecekan pembatasan tenant
```
Hal ini memungkinkan tim pengembang atau pengelola sistem untuk dengan bebas melihat dan menelusuri data di seluruh database tenant untuk keperluan audit maupun debugging.

### B. Akses saat Langganan Kedaluwarsa/Ditangguhkan (Suspended)
Berdasarkan `SubscriptionMiddleware`, ketika langganan sebuah tenant kedaluwarsa atau ditangguhkan, modul operasional HRMS akan dikunci bagi pengguna biasa. Namun, Global Admin tetap dapat mengakses penuh tenant tersebut:
```python
# Terletak di backend/users/middleware.py
if request.user.is_authenticated and (request.user.is_superuser or getattr(request.user, 'is_global_admin', False)):
    return self.get_response(request)
```

### C. Pengelolaan Permintaan Pendaftaran (*Registration Request*)
Fungsi bisnis utama dari Global Admin di portal admin global adalah meninjau (`REVIEW`), menyetujui (`APPROVE`), atau menolak (`REJECT`) calon tenant/perusahaan baru yang mendaftar ke platform SaaS. Ketika pendaftaran disetujui, backend akan secara otomatis melakukan migrasi skema baru untuk penyewa tersebut.

## 4. Perbandingan dengan Admin Biasa (Tenant Admin)

Berikut adalah ringkasan perbedaan mendasar antara peran **Global Admin** (SaaS Platform Operator) dengan **Admin Biasa** (Company Admin):

| Fitur / Sifat | **Global Admin** (`SUPERADMIN`) | **Admin Biasa** (`ADMIN`) |
| :--- | :--- | :--- |
| **Lokasi Database** | Terdaftar di Master Tenant (`public` schema) | Terdaftar di tenant perusahaan spesifik (misal: `tenant_a`) |
| **Cakupan Akses** | **Lintas-Tenant (Global)**. Bisa mengakses seluruh database perusahaan. | **Tunggal (Lokal)**. Terisolasi ketat hanya pada data perusahaannya sendiri. |
| **Akses Portal Admin** | Mengakses portal infrastruktur SaaS (`/login/portal-admin`). | Hanya bisa mengakses dasbor HR internal masing-masing perusahaan. |
| **Tanggung Jawab Utama** | • Validasi & Provisi Tenant baru.<br>• Pemantauan infrastruktur global.<br>• Debugging root system. | • Administrasi data Karyawan.<br>• Rekap Kehadiran (*Attendance*).<br>• Proses Gaji (*Payroll*) & Reimbursement. |
| **Kebijakan Lisensi** | **Kebal**. Tetap memiliki akses penuh saat tenant ditangguhkan (*Suspended*). | **Terpengaruh**. Hak modifikasi data dikunci jika langganan perusahaan kedaluwarsa. |
| **Bypass Middleware** | **Ya**, melewati pembatasan relasi multi-tenant. | **Tidak**. Terikat validasi database schema middleware. |

---

## 5. Konfigurasi Default (Seeded Admin)

Untuk keperluan pengembangan (*development*) dan pengujian otomatis (*automated tests*), akun Global Admin perdana telah diinisialisasi melalui database seeding.

**Informasi Akun Seeded Global Admin:**
* **Email**: `superadmin@harikerja.com`
* **Password**: `password123`
* **Lokasi Penyimpanan**: Skema database `public`.

### Cara Kerja Otomatisasi `superuser`
Setiap kali Anda menjalankan perintah Django `createsuperuser`, sistem secara otomatis akan memberikan atribut `is_global_admin=True` melalui `UserManager`:
```python
def create_superuser(self, email, password=None, **extra_fields):
    extra_fields.setdefault('is_staff', True)
    extra_fields.setdefault('is_superuser', True)
    extra_fields.setdefault('is_global_admin', True) # Otomatis disematkan
    return self.create_user(email, password, **extra_fields)
```

---

## 6. Cara Membuat Akun Superadmin Baru di Server (Manual)

Karena skrip deployment pada server remote (seperti QA/Production) secara default **tidak** menjalankan database seeding demi keamanan, Anda harus membuat akun Global Admin pertama kali secara manual menggunakan tool terminal Django.

Ikuti langkah-langkah berikut pada terminal VPS Anda:

1. **Akses Server via SSH** dan pindah ke folder root proyek (biasanya `/opt/hrms`).
2. **Jalankan Perintah Django Shell** di dalam kontainer docker backend dengan file `.env` yang sesuai:

   **Untuk Lingkungan QA (`harikerja.web.id`):**
   ```bash
   docker compose -f deploy/qa/docker-compose.qa.yml --env-file deploy/environments/.env.qa exec backend python manage.py createsuperuser
   ```

   **Untuk Lingkungan Lokal / Produksi Utama:**
   ```bash
   docker compose exec backend python manage.py createsuperuser
   ```

3. **Isi Formulir Kredensial** yang muncul di layar interaktif:
   *   Masukkan Alamat Email baru Anda.
   *   Buat Password yang aman dan konfirmasikan.

Begitu proses selesai dengan pesan `Superuser created successfully.`, sistem secara otomatis akan menyematkan flag `is_global_admin=True` pada akun tersebut, dan akun siap digunakan untuk login.

---

## 7. Referensi Berkas Terkait
* **Model Pengguna:** [users/models.py](file:///home/afdhal/data/hr/hrms/backend/users/models.py)
* **Middleware Keamanan:** [users/middleware.py](file:///home/afdhal/data/hr/hrms/backend/users/middleware.py)
* **Database Seeder:** [scripts/seeds/core.py](file:///home/afdhal/data/hr/hrms/backend/scripts/seeds/core.py)
* **E2E Test Suites:** [tests/superadmin.spec.ts](file:///home/afdhal/data/hr/hrms/frontend/tests/superadmin.spec.ts)


