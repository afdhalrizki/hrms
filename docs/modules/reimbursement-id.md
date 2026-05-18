# Dokumentasi Modul: Reimbursement Keuangan Karyawan

## 1. Deskripsi Umum
Modul **Reimbursement** memfasilitasi karyawan dalam mengajukan pengembalian uang atas pengeluaran pribadi yang dilakukan untuk kepentingan operasional bisnis perusahaan (misalnya: biaya perjalanan dinas, representasi klien, pengobatan/kesehatan, atau pembelian alat kerja). Modul ini mengotomatisasi penegakan batas nominal klaim, melacak bukti pembayaran digital, dan mengelola alur kerja persetujuan berlapis antara atasan langsung dan departemen keuangan sebelum dana dibayarkan.

* **Target Pengguna**: Karyawan, Supervisor/Atasan Langsung, Tim Keuangan (Finance), dan HR Admin.

---

## 2. Model Basis Data Utama
Pengelolaan klaim keuangan ditangani oleh model Django berikut di dalam Django App `reimbursement`:

1. **`ReimbursementCategory`**: Kategori pengeluaran yang diizinkan oleh perusahaan. Menyimpan nama kategori (misal: Transportasi, Medis, Hiburan), deskripsi kebijakan, serta batas maksimal nominal klaim yang diperbolehkan per pengajuan (`max_amount`).
2. **`Reimbursement`**: Transaksi pengajuan klaim individu. Menyimpan relasi ke profil karyawan pengaju, kategori pengeluaran, tanggal pengeluaran riil, jumlah dana yang diajukan (`amount`), deskripsi tujuan belanja, nomor nota/kuitansi bukti fisik, berkas unggahan bukti nota, status alur persetujuan aktif (`current_stage`), status keputusan (`PENDING`, `APPROVED`, `REJECTED`), nominal akhir yang disetujui bayar oleh keuangan (`approved_amount`), serta catatan tinjauan keuangan (`notes`).

---

## 3. Fitur Utama & Kegunaan
* **Batas Maksimal Pengajuan Otomatis**: Menghindari pengajuan klaim yang tidak wajar dengan memvalidasi nominal input terhadap plafon kategori belanja yang telah dikonfigurasi (`max_amount`).
* **Bukti Pembayaran Digital**: Karyawan wajib mengunggah foto nota, kuitansi, atau invoice fisik sebagai prasyarat administratif klaim guna mencegah manipulasi laporan keuangan.
* **Persetujuan Berlapis (Multi-Stage Approval)**: Dukungan alur kerja dinamis yang melibatkan atasan langsung (untuk verifikasi kebutuhan bisnis) diikuti oleh tim finansial (untuk verifikasi keabsahan dokumen nota belanja).
* **Penyesuaian Nominal Finansial**: Memungkinkan tim keuangan untuk menyetujui pengembalian dana sebagian (`approved_amount` < `amount`) apabila ditemukan pengeluaran non-bisnis dalam rincian nota yang diajukan.

---

## 4. Alur Proses & Flowchart (Mermaid Diagram)

### A. Siklus Pengajuan & Pembayaran Reimbursement
```mermaid
graph TD
    A[Mulai: Karyawan Mengisi Formulir Pengajuan Reimbursement] --> B[Masukkan Tanggal, Kategori, Nominal, & No Nota]
    B --> C[Unggah Scan / Foto Nota Fisik]
    C --> D{Apakah Nominal <= Limit Kategori max_amount?}
    D -- Tidak --> E[Tampilkan Validasi Error: Nominal Melebihi Batas Plafon] --> B
    D -- Ya --> F[Simpan Pengajuan Status PENDING & Pemicu Workflow]
    F --> G[Tahap 1: Persetujuan Atasan Langsung / Supervisor]
    G -->{Apakah Atasan Setuju?}
    G -- Tidak --> H[Status = REJECTED & Selesai]
    G -- Ya --> I[Tahap 2: Verifikasi Fisik oleh Tim Finansial / Keuangan]
    I -->{Keuangan Setuju & Nota Sah?}
    I -- Tidak --> H
    I -- Ya --> J[Tentukan Nominal approved_amount & Isi Catatan Pembayaran]
    J --> K[Ubah Status = APPROVED]
    K --> L[Sistem Tandai Pembayaran Siap Ditransfer]
    L --> M[Selesai]
```

---

## 5. Integrasi Antar-Modul
* **Integrasi dengan Modul `core`**: Membaca data `Employee` untuk identifikasi profil pengaju, atasan langsung yang memproses persetujuan awal, serta menggunakan sistem persetujuan N-level pada `WorkflowConfig` / `WorkflowStage` jika rute dinamis diaktifkan oleh perusahaan.
* **Integrasi dengan Modul `tenants`**: Membaca kebijakan persetujuan global tenant pada model `Tenant` (`reimbursement_approval_level`) untuk menentukan apakah pengajuan membutuhkan verifikasi ganda (Atasan & Keuangan) atau cukup salah satunya saja.

---

## 6. Hak Akses (RBAC) & Keamanan
Operasional pengelolaan reimbursement diatur berdasarkan tingkatan izin akses:
* **`tenant_approve_reimbursement`**: Hak akses yang wajib didelegasikan kepada manajer divisi atau kepala tim keuangan untuk memeriksa, mengedit nominal persetujuan, menulis memo keputusan, dan menyetujui/menolak berkas klaim karyawan.
* **Keamanan Berkas**: Seluruh berkas nota yang diunggah diletakkan pada folder terenkripsi yang diisolasi per tenant menggunakan utilitas `reimbursement_upload_path` demi mencegah kebocoran informasi dokumen keuangan internal perusahaan ke publik.
