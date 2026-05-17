# Referensi API & Panduan Integrasi

## 📚 Tinjauan Umum
Dokumentasi API komprehensif bagi pengembang yang berintegrasi dengan harikerja HRMS. Semua endpoint API memerlukan otentikasi dan konteks tenant yang tepat.

## 🔑 Otentikasi
### Otentikasi JWT
```http
POST /api/auth/login/
Content-Type: application/json
X-Tenant: company1.localhost

{
  "email": "user@company.com",
  "password": "password123"
}

Respon:
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "email": "user@company.com",
    "is_staff": true
  }
}
```

### Penyegaran Token
```http
POST /api/auth/token/refresh/
Content-Type: application/json

{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}

Respon:
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

### Header Konteks Tenant
Semua permintaan API harus menyertakan konteks tenant:
```http
GET /api/employees/
X-Tenant: company1.localhost
Authorization: Bearer <access_token>
```

---

## 📊 Dasbor & Analitik
### Statistik Dasbor
- `GET /api/core/dashboard-stats/` - Mengambil statistik ringkasan (total karyawan, % kehadiran, cuti tertunda, total penggajian).

### Pengaturan Tenant & Branding
- `GET /api/tenant/settings/` - Mengambil pengaturan branding tenant saat ini (logo, warna utama, nama perusahaan).

---

## 👥 API Manajemen Pengguna
### Endpoint Karyawan
- `GET /api/employees/` - Mencantumkan karyawan dengan penomoran halaman (pagination). Mendukung `?lite=true` untuk data minimal.
- `POST /api/employees/` - Membuat karyawan baru. Opsional: `create_user: true` untuk menyediakan login.
- `GET /api/employees/{id}/` - Mengambil rincian karyawan.
- `PATCH /api/employees/{id}/` - Memperbarui profil karyawan (mendukung unggahan dokumen melalui Multipart).
- `DELETE /api/employees/{id}/` - Menghapus karyawan (penghapusan lunak/soft delete).

### Endpoint Layanan Mandiri (Self-Service)
- `GET /api/users/me/` - Mengambil profil pengguna saat ini dan data karyawan yang terkait.

---

## 📅 API Kehadiran
### Clock In/Out
```http
POST /api/attendance/
Content-Type: application/json
X-Tenant: company1.localhost
Authorization: Bearer <access_token>

{
  "latitude_in": -6.2088,
  "longitude_in": 106.8456,
  "check_in": "08:00:00",
  "photo_in": "base64_encoded_image",
  "platform": "mobile"
}
```

### Cuti & Lembur
- `GET /api/leave-requests/` - Mencantumkan permintaan cuti.
- `POST /api/leave-requests/` - Membuat pengajuan cuti.
- `PATCH /api/leave-requests/{id}/` - Menyetujui/Menolak cuti dengan `action: "APPROVED"` dan `comment`.
- `GET /api/leave-balances/` - Mengambil kuota dan penggunaan cuti saat ini.
- `GET /api/overtime/` - Mencantumkan permintaan lembur.
- `POST /api/overtime/` - Mengajukan lembur.

### Koreksi
- `GET /api/attendance-corrections/` - Mencantumkan permintaan koreksi.
- `POST /api/attendance-corrections/` - Meminta koreksi waktu clock-in/out.

### Ekspor & Laporan
- `GET /api/attendance/download_pdf/` - Mengunduh laporan kehadiran individu (PDF).
- `GET /api/attendance/export_xlsx/` - Mengekspor rekap kehadiran (Excel).
- `GET /api/attendance/export_csv/` - Mengekspor ringkasan (CSV).

---

## 💰 API Penggajian
### Manajemen Slip Gaji
- `GET /api/payslips/` - Mencantumkan slip gaji yang tersedia.
- `GET /api/payslips/{id}/download_pdf/` - Mengunduh slip gaji sebagai PDF.
- `GET /api/payslips/{id}/download_docx/` - Mengunduh slip gaji sebagai DOCX.
- `GET /api/payslips/export_recap_xlsx/` - Mengekspor rekap penggajian untuk suatu periode.

---

## 📈 API Kinerja
### KPI & Penilaian (Appraisal)
- `GET /api/kpis/` - Mencantumkan KPI yang tersedia.
- `GET /api/kpi-targets/` - Melihat target karyawan yang ditugaskan.
- `GET /api/appraisals/` - Mencantumkan penilaian kinerja.
- `POST /api/appraisal-reviews/` - Mengirimkan tinjauan atau penilaian mandiri.
- `GET /api/appraisals/{id}/download_pdf/` - Mengunduh ringkasan penilaian.

---

## 🔄 Mesin Alur Kerja (Workflow Engine)
- `GET /api/workflow-configs/` - Mencantumkan konfigurasi alur kerja untuk modul.
- `GET /api/workflow-stages/` - Melihat tahapan persetujuan.
- `GET /api/workflow-actions/` - Melihat riwayat audit dari tindakan alur kerja.

---

## 🏢 Administrasi Sistem
### Pendaftaran Publik & Manajemen Global
- `POST /api/public/signup/` - Pendaftaran publik untuk tenant perusahaan baru.
- `GET /api/internal/registrations/` - Mencantumkan pendaftaran tertunda (Admin Global).
- `POST /api/internal/registrations/{id}/approve/` - Menyetujui pendaftaran (Admin Global).
- `POST /api/internal/registrations/{id}/reject/` - Menolak pendaftaran (Admin Global).
- `GET /api/internal/global-admins/` - Mencantumkan admin global (Hanya Superadmin).
- `POST /api/internal/global-admins/` - Membuat admin global baru (Hanya Superadmin).
- `PATCH /api/internal/global-admins/{id}/` - Memperbarui admin global (Hanya Superadmin).
- `DELETE /api/internal/global-admins/{id}/` - Menghapus admin global (Hanya Superadmin).

### Keamanan & Audit
- `GET /api/api-keys/` - Mengelola kunci API untuk integrasi eksternal.
- `GET /api/audit-logs/` - Melihat jejak audit seluruh sistem (Memerlukan `view_audit_logs`).

---

## ⚠️ Batas Tarif & Kuota
- **Batas Tarif**: Standar 100 permintaan per menit per pengguna.
- **Penegakan Kuota**: Pembuatan karyawan diblokir jika kapasitas paket tenant terlampaui.

## 🚨 Penanganan Kesalahan
### Kode Kesalahan Umum
- `400` - Permintaan Buruk (kesalahan validasi)
- `401` - Tidak Terautentikasi (token tidak valid/hilang)
- `403` - Terlarang (izin tidak mencukupi atau kuota terlampaui)
- `404` - Tidak Ditemukan
- `429` - Terlalu Banyak Permintaan (batas tarif terlampaui)

### Contoh Kesalahan Kuota & Langganan
```json
{
  "error": "Kuota karyawan terlampaui untuk paket FREE Anda (Batas: 10).",
  "code": "QUOTA_EXCEEDED"
}
```

```json
{
  "error": "Langganan Anda telah kedaluwarsa. Silakan perbarui untuk memulihkan akses penuh.",
  "code": "SUBSCRIPTION_EXPIRED_READ_ONLY"
}
```

```json
{
  "error": "Langganan Anda ditangguhkan karena belum melakukan pembayaran.",
  "code": "SUBSCRIPTION_SUSPENDED"
}
```

---

**Terakhir Diperbarui**: 7 Mei 2026  
**Versi API**: v1.5.0  
**URL Dasar**: https://api.harikerja.com
