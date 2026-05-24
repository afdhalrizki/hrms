# Checklist Fitur & Peta Jalan harikerja

Dokumen ini memberikan tinjauan komprehensif tentang fitur yang saat ini telah diimplementasikan dan peta jalan strategis untuk platform HRMS harikerja.

## ✅ Fitur yang Ada (Selesai)

### 🏗️ 1. Pondasi Sistem & Multi-Tenancy
- [x] **Multi-Tenancy Berbasis Skema**: Skema PostgreSQL yang terisolasi untuk keamanan data 100% per tenant.
- [x] **Penyediaan Otomatis (Provisioning)**: Pembuatan skema dan penyemaian database secara real-time setelah persetujuan tenant.
- [x] **Perutean Subdomain Dinamis**: Identifikasi tenant melalui URL hostname (misalnya, `client.harikerja.com`).
- [x] **Pembatasan Sumber Daya Bertingkat**: Fitur masking dan kuota sumber daya (jumlah karyawan, penyimpanan) berdasarkan paket.
- [x] **Portal Admin Global**: Manajemen terpusat untuk pendaftaran tenant, penagihan, dan kesehatan sistem.

### 👤 2. Data Master HR & Identitas Pengguna
- [x] **Profil Karyawan**: Manajemen PII yang komprehensif (Pribadi, Perbankan, Keluarga, Pendidikan).
- [x] **Struktur Organisasi**: Dukungan multi-cabang dengan Departemen dan Jabatan pekerjaan yang dinamis.
- [x] **Autentikasi Terpadu**: Sistem login bersama untuk Web dan Mobile dengan keamanan rotasi JWT.
- [x] **RBAC Hybrid**: Izin berbasis kemampuan dengan peran default (Admin, HR, Staf).
- [x] **Gudang Dokumen (Document Vault)**: Unggahan aman untuk KTP/NPWP dan foto biometrik profil.

### 📍 3. Kehadiran & Geofencing
- [x] **Geofencing Pintar**: Validasi clock-in/out berbasis GPS terhadap radius koordinat spesifik cabang.
- [x] **Verifikasi Biometrik**: Pencatatan metadata pengenalan wajah untuk kehadiran mobile.
- [x] **Manajemen Shift**: Dukungan untuk jadwal tetap dan shift fleksibel.
- [x] **Koreksi Kehadiran**: Alur kerja permintaan karyawan untuk penyesuaian waktu manual dengan audit persetujuan.
- [x] **Mesin Ekspor**: Pembuatan laporan kehadiran PDF/Excel/CSV secara real-time.

### 💰 4. Penggajian & Pajak Indonesia (TER 2024)
- [x] **Pajak PPh 21**: Kepatuhan penuh dengan peraturan "Tarif Efektif Rata-rata" (TER 2024) terbaru.
- [x] **Integrasi BPJS**: Perhitungan otomatis untuk BPJS Kesehatan dan Ketenagakerjaan (JKK, JKM, JHT, JP).
- [x] **Gaji Variabel**: Dukungan untuk lembur, tunjangan, bonus, dan potongan pinjaman.
- [x] **Slip Gaji Digital**: Pembuatan slip gaji PDF aman secara otomatis dengan akses mobile.
- [x] **Periode Penggajian**: Manajemen periode multi-tenant dengan kemampuan perhitungan massal.

### 📈 5. Kinerja & Manajemen KPI
- [x] **Strategi KPI**: Definisi Indikator Kinerja Utama tingkat individu dan departemen.
- [x] **Siklus Hidup Penilaian**: Tahapan peninjauan terstruktur (Draft, Sedang Ditinjau, Selesai).
- [x] **Pencapaian Real-time**: Visualisasi kemajuan terhadap target KPI.
- [x] **Persetujuan Multi-tahap**: Alur kerja terintegrasi untuk finalisasi tinjauan kinerja.

### 📱 6. Mobile & Layanan Mandiri (ESS)
- [x] **Aplikasi Mobile Terpadu**: Pengalaman Flutter asli untuk semua tugas yang berhadapan dengan karyawan.
- [x] **Alur Kerja Permintaan**: Pengajuan mobile untuk Cuti, Lembur, dan Reimbursement.
- [x] **Saldo Real-time**: Tampilan instan kuota cuti dan riwayat slip gaji.
- [x] **Ketahanan Offline**: Penanganan konektivitas terputus yang kuat selama clock-in.

---

## 🚀 Peta Jalan Masa Depan (Direncanakan)

### 📅 Fase 1: Q3-Q4 2026 (Kemenangan Cepat)
- [ ] **Sistem Notifikasi Real-time**: Peringatan berbasis WebSocket dan Notifikasi Push Firebase.
- [ ] **Sistem Manajemen Dokumen (DMS)**: Ekstraksi dokumen bertenaga OCR dan pelacakan masa berlaku.
- [ ] **Dukungan Mobile yang Ditingkatkan**: Cache SQLite lokal untuk pengajuan kehadiran offline penuh.

### 📅 Fase 2: Q1-Q2 2027 (Peningkatan Inti)
- [ ] **Dasbor Analitik Lanjutan**: Model turnover prediktif dan pengoptimalan biaya operasional.
- [ ] **Hub Integrasi**: Sinkronisasi mulus dengan ERP (SAP/Oracle) dan perangkat lunak Akuntansi (QuickBooks/Jurnal).
- [ ] **Manajemen Cuti Lanjutan**: Mesin akrual pro-rata dan kebijakan spesifik departemen.

### 📅 Fase 3: Q3-Q4 2027 (Fitur Perusahaan)
- [ ] **Kemampuan AI/ML**: Deteksi kecurangan dalam pola kehadiran dan pencocokan rekrutmen AI.
- [ ] **Suite Intelijen Bisnis**: Pembuat laporan seret-dan-lepas dan visualisasi data interaktif.
- [ ] **Ekspansi Internasional**: Dukungan multi-mata uang dan kepatuhan lokal untuk 10+ negara.

---
**Terakhir Diperbarui**: 7 Mei 2026  
**Status**: Kesetaraan Fitur Tercapai (Fase B1-B7)
