# Dokumentasi Sistem RBAC HRMS

Dokumen ini menguraikan arsitektur, izin, dan manajemen peran untuk Sistem Manajemen SDM (HRMS). Sistem ini menggunakan model **RBAC Dinamis Berbasis Kemampuan** untuk memberikan fleksibilitas bagi admin perusahaan dan penegakan keamanan yang ketat.

## Tinjauan Arsitektur

Sistem RBAC dibangun di atas tiga pilar utama:

1.  **Kumpulan Izin Kanonikal (Canonical Permission Pool)**: Daftar tetap string unik yang mewakili tindakan tertentu atau tingkat akses data.
2.  **Peran Akses Dinamis (Dynamic Access Roles)**: Peran spesifik tenant yang disimpan dalam model `AccessRole`, di mana izin individu diaktifkan melalui `JSONField`.
3.  **Identitas UI yang Disintesis**: Pemetaan tingkat tinggi dari izin granular ke label yang ramah UI (ADMIN, MANAGER, EMPLOYEE).

---

## Pengguna Dasar Global (Django AbstractUser)

Sebagai dasar global, sistem memanfaatkan flag boolean bawaan yang disediakan oleh `AbstractUser` Django, bersama dengan bidang kustom `is_global_admin` kami, untuk menetapkan tingkat akses fundamental sebelum menerapkan kemampuan RBAC kustom.

### Flag Bawaan Django
*   **`is_superuser`**: Menandakan akses mutlak ke seluruh sistem. Jika `True`, sistem mengabaikan semua pemeriksaan izin lainnya dan memberikan akses penuh.
*   **`is_staff`**: Secara tradisional menandakan apakah pengguna dapat mengakses Panel Admin Django (`/admin/`). Dalam konteks HRMS kami, ini juga dimanfaatkan untuk mengidentifikasi **Administrator Tenant**, yang menjamin mereka hak administratif penuh dalam tenant masing-masing (melewati pemeriksaan RBAC tertentu).
*   **`is_active`**: Menentukan apakah akun pengguna aktif. Ini berfungsi sebagai mekanisme penghapusan lunak (soft-deletion) dan pemblokiran akun kami.

### Flag Multi-Tenant Kustom
*   **`is_global_admin`**: Bidang kustom yang dirancang khusus untuk arsitektur SaaS multi-tenant kami. Ini memungkinkan administrator sistem (misalnya, pemilik platform) untuk melewati batasan isolasi tenant standar untuk mengelola konfigurasi lintas perusahaan dan memberikan dukungan, memisahkan "Administrasi SaaS" dari "Administrasi Perusahaan" secara bersih.

---

## Daftar Izin Kanonikal

Kunci-kunci berikut adalah "sumber kebenaran" (source of truth) bagi sistem. Penggunaan kunci-kunci ini secara konsisten di seluruh Backend (View) dan Frontend (Komponen) adalah wajib.

### 1. Manajemen & Pengaturan
| Kunci Izin | Deskripsi |
| :--- | :--- |
| `manage_settings` | Mengubah konfigurasi seluruh tenant, branding, dan integrasi API. |
| `manage_hr` | Kontrol penuh atas Karyawan, Departemen, Peran, dan Cabang. |
| `manage_access_roles` | Menentukan dan menetapkan peran RBAC ke karyawan lain. |
| `view_audit_logs` | Mengakses jejak audit seluruh sistem untuk ketertelusuran. |
| `view_all_payslips` | Melihat slip gaji untuk semua karyawan (Manajer Keuangan/SDM). |
| `view_performance_report` | Mengakses laporan kinerja global atau tingkat departemen. |

### 2. Modul Operasional
| Kunci Izin | Deskripsi |
| :--- | :--- |
| `manage_attendance` | Mengelola shift, jadwal, dan melihat catatan kehadiran global. |
| `manage_payroll` | Menghitung gaji, membuat slip gaji, dan mengelola golongan gaji. |
| `manage_reimbursement` | Mengonfigurasi kategori reimbursement dan batas global. |
| `manage_performance` | Membuat templat penilaian, KPI, dan Mengelola siklus peninjauan. |

### 3. Alur Kerja Persetujuan (Manajemen Menengah)
| Kunci Izin | Deskripsi |
| :--- | :--- |
| `approve_leave` | Menyetujui atau menolak permintaan cuti dan izin. |
| `approve_reimbursement` | Menyetujui atau menolak klaim biaya dan reimbursement. |
| `approve_attendance_correction` | Menyetujui koreksi kehadiran atau clock-in manual. |

---

## Peran Default Sistem

Setiap tenant baru secara otomatis diinisialisasi dengan peran-peran ini melalui sinyal `post_schema_sync`. Untuk memastikan stabilitas sistem, **Peran Default tidak dapat dihapus.**

### 1. Admin (is_default: True)
*   **Tujuan**: Akun utama untuk tenant.
*   **Izin**: Semua izin diatur ke `True`.
*   **Identitas Utama**: `ADMIN`

### 2. Manajer HR (is_default: True)
*   **Tujuan**: Manajemen operasional SDM.
*   **Izin**: `manage_hr`, `manage_attendance`, `manage_payroll`, dan semua izin `approve_*`.
*   **Identitas Utama**: `MANAGER`

### 3. Staf (is_default: True)
*   **Tujuan**: Layanan mandiri karyawan standar.
*   **Izin**: Tidak ada (Hanya memiliki hak "Layanan Mandiri" yang secara implisit diizinkan untuk pemilik yang terautentikasi).
*   **Identitas Utama**: `EMPLOYEE`

---

## Detail Implementasi Keamanan

### Penegakan Backend
View menggunakan kelas `HasRBACPermission`. Kelas ini memeriksa:
1.  Jika pengguna adalah **Admin Tenant** (`is_staff`): Akses penuh diberikan segera.
2.  Jika `required_rbac_permission` diatur: JSON `AccessRole.permissions` yang terkait dengan pengguna diperiksa untuk kunci tersebut.
3.  **Pemeriksaan Kepemilikan**: Bahkan tanpa izin manajemen, pengguna selalu dapat mengambil (`retrieve`) atau memperbarui (`update`) catatan *mereka sendiri* (misalnya, profil mereka sendiri atau permintaan cuti).

### Penjaga Penghapusan
Model `AccessRole` mengimplementasikan override `delete()`:
```python
def delete(self, *args, **kwargs):
    if self.is_default:
        raise ValidationError("Peran default sistem tidak dapat dihapus.")
    return super().delete(*args, **kwargs)
```
