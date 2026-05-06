# Pemetaan Notifikasi: Operasional (Karyawan & Manajer)
Versi: 1.0
Status: Diusulkan

Dokumen ini memetakan notifikasi operasional harian bagi **Karyawan** dan **Manajer** (Atasan) dalam platform harikerja HRMS.

---

## 👤 1. Notifikasi Karyawan
Fokus: Tugas pribadi, status permintaan, dan pembaruan administratif.

| Kategori | Peristiwa | Tingkat | Pesan |
| :--- | :--- | :--- | :--- |
| **Kehadiran** | **Pengingat Clock-in** | INFO | "Selamat pagi! Jangan lupa untuk Clock-in hari ini [Date] untuk menghindari status 'Alpa'." |
| **Kehadiran** | **Pengingat Clock-out** | INFO | "Hari kerja akan berakhir. Ingatlah untuk melakukan Clock-out sebelum pulang." |
| **Alur Kerja** | **Permintaan Disetujui** | SUCCESS | "Permintaan [Cuti/Lembur/Koreksi] Anda untuk tanggal [Date] telah **Disetujui**." |
| **Alur Kerja** | **Permintaan Ditolak** | ERROR | "Permintaan [Cuti/Lembur] Anda ditolak. Alasan: [Comment]." |
| **Penggajian** | **Slip Gaji Tersedia** | SUCCESS | "Slip gaji Anda untuk bulan [Month/Year] sekarang tersedia untuk diunduh." |
| **Reimbursement** | **Status Klaim** | INFO | "Klaim reimbursement Anda untuk '[Expense Name]' telah [Diproses/Dibayar]." |
| **Cuti** | **Pembaruan Saldo** | INFO | "Saldo cuti Anda untuk tahun ini telah diperbarui. Anda memiliki sisa [X] hari." |

---

## 👨‍💼 2. Notifikasi Manajer / Atasan
Fokus: Pengawasan tim dan manajemen alur kerja persetujuan.

| Kategori | Peristiwa | Tingkat | Pesan |
| :--- | :--- | :--- | :--- |
| **Alur Kerja** | **Menunggu Persetujuan** | WARNING | "[Employee Name] mengajukan permintaan [Cuti/Lembur]. Tindakan diperlukan." |
| **Kehadiran** | **Peringatan Alpa** | INFO | "[Employee Name] ditandai sebagai **Alpa** hari ini (Tidak ada Clock-in hingga 09:30)." |
| **Kehadiran** | **Peringatan Terlambat** | INFO | "[Employee Name] melakukan clock-in terlambat pada pukul [Time]." |
| **Kinerja** | **Tugas Penilaian** | INFO | "Sudah waktunya untuk penilaian kinerja [Employee Name]. Silakan berikan umpan balik Anda." |
| **Alur Kerja** | **Pembaruan Tingkat-N** | INFO | "Persetujuan Tingkat 1 selesai. Permintaan [ID] sekarang menunggu tinjauan Departemen HR." |

---

## 📢 3. Pengumuman Umum & Sistem
Siaran ke semua pengguna aktif dalam organisasi.

| Kategori | Peristiwa | Tingkat | Pesan |
| :--- | :--- | :--- | :--- |
| **Pengumuman** | **Berita Perusahaan** | INFO | "[Judul Admin]: [Ringkasan Pesan...]" |
| **Sistem** | **Pemeliharaan** | WARNING | "Pemeliharaan terjadwal pada [Date] pukul [Time]. Sistem akan offline selama 30 menit." |
| **Keamanan** | **Upgrade Tingkat** | SUCCESS | "Seluruh Perusahaan: Kita telah beralih ke paket [Premium]! Modul baru (Kinerja) sekarang aktif." |

---

## 🛠️ Catatan Implementasi
- **Pengiriman Saluran**: Notifikasi Push (Mobile), Web-Socket (Lonceng waktu nyata), dan Email (Ringkasan harian).
- **Pemicu**: Terhubung ke sinyal post-save `WorkflowAction`.
- **Privasi**: Peringatan kehadiran untuk Manajer hanya boleh dipicu untuk bawahan langsung mereka (berdasarkan bidang `Employee.supervisor`).
