# Logika & Strategi Otomatisasi Harikerja

Dokumen ini memberikan tinjauan komprehensif tentang otomatisasi dalam harikerja HRMS, yang mencakup orkestrasi DevOps dan otomatisasi logika bisnis inti.

---

## 1. Orkestrasi DevOps & Lingkungan
Proyek ini menggunakan sistem skrip terpadu untuk memastikan kompatibilitas lintas platform bagi semua pengembang.

### Filosofi Orkestrasi
- **`*.mjs` (JavaScript/Node.js)**: **Sumber Kebenaran** (Source of Truth). Sistem skrip terpadu yang dirancang untuk Linux, macOS, dan Windows untuk memastikan konsistensi di seluruh lingkungan.

### Tugas Otomatis Utama
- **Pemeriksaan Dependensi Cerdas**: Menggunakan `.venv_requirements.hash` untuk melewatkan `pip install` atau `npm install` yang redundan.
- **Pemeriksaan Kesehatan Otomatis**: Skrip menunggu backend/frontend dapat dijangkau (HTTP 200/404) sebelum memulai pengujian.
- **Pembersihan Otomatis**: Proses yang menggantung pada port 8000 dan 3000 secara otomatis diidentifikasi dan dihentikan sebelum sesi baru dimulai.
- **Seeding Terintegrasi**: Pekerja tes paralel (`up.mjs --workers=N`) secara otomatis menyediakan database tenant terisolasi dan menanamkan (seed) data pengujian yang diperlukan.

---

## 2. Otomatisasi Kehadiran & Geofencing
Pemrosesan kehadiran ditangani oleh `AttendanceService` untuk memastikan konsistensi di seluruh Web dan Mobile.

### Perhitungan Status Otomatis
- **Geofencing**: Menggunakan formula Haversine untuk menghitung jarak antara GPS pengguna dan koordinat cabang. Jika di luar radius yang diizinkan, status secara otomatis diatur ke `OFF_SITE`.
- **Pemetaan Shift**: Membandingkan `check_in_time` dengan `Jadwal` (Schedule) yang ditugaskan atau `Shift` default.
    - `PRESENT` (HADIR): Berada dalam geofence dan tepat waktu.
    - `LATE` (TERLAMBAT): Berada dalam geofence tetapi setelah waktu mulai shift (untuk shift non-fleksibel).
    - `OFF_SITE`: Di luar radius cabang.
- **Deteksi Konflik Cuti**: Secara otomatis memblokir clock-in jika ada permintaan cuti yang berstatus `APPROVED` (DISETUJUI) untuk tanggal saat ini.

---

## 3. Mesin Alur Kerja & Persetujuan
Permintaan bisnis (Cuti, Reimbursement, Koreksi) mengikuti alur kerja otomatis berbasis aturan.

### Tahapan dan Transisi
1. **Inisialisasi**: Saat permintaan dibuat, `WorkflowService.initialize_workflow` mengidentifikasi `WorkflowConfig` yang benar dan mengatur `current_stage` ke urutan 1.
2. **Identifikasi Penyetuju (Approver)**: Penyetuju ditentukan secara dinamis berdasarkan konfigurasi tahap:
    - `SUPERVISOR`: Penyetuju adalah atasan langsung dari karyawan yang meminta.
    - `EMPLOYEE`: Penyetuju adalah ID karyawan spesifik yang ditunjuk untuk tahap tersebut.
3. **Pemrosesan Multi-Tahap**: Permintaan bergerak melalui urutan (1 → 2 → N) setelah tindakan `APPROVED`.
4. **Bypass Admin**: Jika Admin Tenant (dengan `tenant_manage_settings`) menyetujui permintaan, tahap selanjutnya dilewati, dan permintaan segera difinalisasi.
5. **Finalisasi**: Saat tahap terakhir disetujui, status berpindah ke `APPROVED`, dan otomatisasi sekunder dipicu (misalnya, memotong saldo cuti atau memperbarui log kehadiran).

---

## 4. Penegakan Operasional
### Penegakan Kuota & Paket
- **Kuota Karyawan**: Sistem secara otomatis menghitung karyawan aktif dan memblokir `POST /api/employees/` jika kapasitas paket (Dasar + Tambahan) terlampaui.
- **Manajemen Penyimpanan**: Foto biometrik secara otomatis "dilewati" jika kapasitas penyimpanan tenant penuh, memungkinkan clock-in tetap berjalan tanpa lampiran.
- **Kebijakan Platform**: Organisasi dapat memberlakukan kebijakan clock-in `MOBILE_ONLY` (HANYA MOBILE), yang secara otomatis menolak permintaan kehadiran berbasis web.

### Anonimisasi Data
- **Log Audit**: Perubahan dilacak secara otomatis melalui `AuditModelMixin`, tetapi data PII disamarkan dalam log untuk memastikan kepatuhan terhadap standar privasi.

---
**Terakhir Diperbarui**: 28 April 2026  
**File Terkait**: `backend/attendance/services.py`, `backend/core/services.py`, `up.mjs`
