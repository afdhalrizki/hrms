# Klasifikasi Otentikasi dan Otorisasi HRMS

Dokumen ini memberikan klasifikasi komprehensif tentang rute frontend Next.js dan endpoint backend Django yang sesuai, yang menguraikan kebijakan otentikasi dan otorisasi yang diberlakukan di seluruh platform HRMS.

---

## 1. Tinjauan Arsitektur

Platform HRMS memanfaatkan arsitektur multi-tenant yang kuat. Penegakan keamanan terjadi di sisi server/klien Next.js dan lapisan backend Django.

### 1.1 Lapisan Otentikasi
* **Verifikasi Identitas:** Ditangani menggunakan JWT (melalui `rest_framework_simplejwt`) dan cookie sesi.
* **Isolasi Tenant:** Ditegakkan oleh `TenantAccessPermission` di backend, yang memastikan permintaan menggunakan token yang terikat secara eksplisit ke skema tenant yang cocok dengan header `X-Tenant`.

### 1.2 Lapisan Otorisasi (RBAC)
* **HasRBACPermission:** Memeriksa apakah pengguna yang diautentikasi memiliki izin yang diperlukan yang ditetapkan dalam `AccessRole` aktif mereka (misalnya, `manage_employees`).
* **Bypass Layanan Mandiri (Self-Service):** Memungkinkan pengguna non-admin untuk melihat/mengubah catatan mereka sendiri tanpa memerlukan izin administratif global.
* **Pemeriksaan Langganan:** `SubscriptionStatusPermission` menegakkan batasan cakupan berdasarkan status tenant (`ACTIVE`, `EXPIRED`, `SUSPENDED`).

---

## 2. Matriks Rute & Izin

Bagian berikut mengklasifikasikan setiap rute frontend dan tingkat otentikasi serta otorisasinya masing-masing.

### 2.1 Tingkat Publik & Tanpa Otentikasi
Tidak diperlukan otentikasi. Dapat diakses oleh semua pengunjung.

| Rute Next.js Frontend | Endpoint Backend Terkait | Kebijakan Akses / Kelas Izin |
| :--- | :--- | :--- |
| `/` | N/A | Halaman publik statis. Tidak ada kunci backend. |
| `/[locale]/about` | N/A | Halaman publik statis. Tidak ada kunci backend. |
| `/[locale]/signup` | `POST /api/public/signup/` | `AllowAny` (Hanya menegakkan skema publik). |
| `/[locale]/login` | `POST /api/auth/login/` | `AllowAny` (Melakukan validasi identitas awal). |
| `/[locale]/registration`| `GET /api/internal/registrations/` | `AllowAny` |

### 2.2 Tingkat Terautentikasi & Layanan Mandiri
Memerlukan otentikasi. Karyawan standar dapat melihat atau mengelola data mereka sendiri tetapi tidak dapat melihat catatan karyawan lain.

| Rute Next.js Frontend | Endpoint Backend Terkait | Izin Backend yang Diperlukan |
| :--- | :--- | :--- |
| `/[locale]/profile` | `GET /api/users/me/` | `IsAuthenticated` + `TenantAccessPermission`. |
| `/[locale]/attendance` | `POST /api/attendance/` | `IsAuthenticated` + `allow_self_service = True`. |
| `/[locale]/leaves` | `POST /api/leave-requests/` | `IsAuthenticated` + `allow_self_service = True`. |
| `/[locale]/payroll` | `GET /api/payslips/` | `IsAuthenticated` + `allow_self_service = True`. |
| `/[locale]/reimbursements`| `POST /api/reimbursements/` | `IsAuthenticated` + `allow_self_service = True`. |

### 2.3 Tingkat Manajemen & Berbasis Peran (RBAC)
Memerlukan otentikasi dan hak istimewa administratif atau manajer yang eksplisit.

| Rute Next.js Frontend | Endpoint Backend Terkait | Izin RBAC yang Diperlukan |
| :--- | :--- | :--- |
| `/[locale]/employees` | `/api/employees/` | `manage_employees` |
| `/[locale]/branches` | `/api/branches/` | `manage_branches` |
| `/[locale]/attendance` *(Tab Persetujuan)* | `/api/attendance/` | `manage_attendance` (atau Atasan Langsung) |
| `/[locale]/leaves` *(Tab Persetujuan)* | `/api/leave-requests/` | `manage_leaves` (atau Atasan Langsung) |
| `/[locale]/payroll` *(Tab Admin)* | `/api/payroll-periods/` | `manage_payroll` |
| `/[locale]/workflows` | `/api/workflow-configs/` | `manage_workflows` |
| `/[locale]/analytics` | `/api/core/dashboard-stats/`| `view_analytics` / `view_reports` |
| `/[locale]/reports` | `/api/audit-logs/` | `view_reports` |
| `/[locale]/settings` | `/api/tenant/settings/` | `manage_tenant_settings` |

### 2.4 Tingkat Administratif Global Sistem
Terbatas secara eksklusif untuk Administrator Global dan Superuser.

| Rute Next.js Frontend | Endpoint Backend Terkait | Izin yang Diperlukan |
| :--- | :--- | :--- |
| `/[locale]/admin/registrations` | `/api/internal/registrations/` | `request.user.is_superuser` atau `global_role` |
| `/[locale]/portal-admin` | N/A (Antarmuka Admin) | Admin sistem global saja |

---

## 3. Penjelasan Mendalam Izin Inti Backend

### 3.1 `TenantAccessPermission`
```python
class TenantAccessPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        # 1. Menegakkan otentikasi identitas
        # 2. Memastikan pengguna termasuk dalam tenant aktif saat ini
        # 3. Memvalidasi cakupan tenant JWT sesuai dengan tenant yang diminta
```

### 3.2 `HasRBACPermission`
```python
class HasRBACPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        # 1. Bypass pemeriksaan untuk Admin Tenant (is_staff)
        # 2. Memeriksa apakah view mendefinisikan 'required_rbac_permission'
        # 3. Mengonfirmasi peran karyawan pengguna memiliki flag boolean tertentu yang aktif
```

### 3.3 `SubscriptionStatusPermission`
```python
class SubscriptionStatusPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        # Membatasi kemampuan operasional berdasarkan fase penagihan:
        # ACTIVE -> Semua tindakan diizinkan.
        # EXPIRED -> Metode AMAN (GET) diizinkan; pembuatan/perubahan diblokir.
        # SUSPENDED -> Semua permintaan diblokir (403 Forbidden).
```

---

## 4. Referensi Terkait

Untuk detail pemetaan menu dan halaman spesifik yang dapat diakses oleh masing-masing tipe pengguna di aplikasi Web maupun Mobile, lihat:
*   **[Detail Matriks Peran & Izin (Web & Mobile)](file:///home/afdhal/data/hr/hrms/docs/workflows_features/rbac_matrix_details-id.md)**

