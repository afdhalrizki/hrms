# Fitur Masa Depan: Asisten Dukungan AI & Sistem Tiket

Dokumen ini menguraikan cetak biru untuk **Sistem Tiket Dukungan Internal**, yang nantinya akan berkembang menjadi **Asisten Dukungan berbasis AI**. Sistem ini dirancang untuk memberikan kemampuan helpdesk multi-tenant dengan keamanan tinggi yang terintegrasi langsung ke dalam ekosistem harikerja HRMS.

## 🤖 Jalur Evolusi AI
1.  **Fase 1: Tiket Terstruktur** (Cetak Biru Saat Ini)
    -   Pembuatan tiket manual dan respons manusia.
2.  **Fase 2: Mesin Saran AI**
    -   Saat karyawan mengetik masalah mereka, AI menyarankan jawaban dari Buku Panduan Kebijakan HR perusahaan (yang disimpan di Basis Pengetahuan).
3.  **Fase 3: Resolusi Otomatis**
    -   AI menangani pertanyaan rutin (misalnya, "Bagaimana cara memperbarui NPWP saya?") dan hanya meneruskan masalah penggajian yang kompleks ke admin HR manusia.

## 🏗️ Arsitektur Teknis (Basis Bersama/Tenant)

### Model Backend (Django)
*   **Tiket (Ticket)**:
    -   `tenant`: Isolasi multi-tenant.
    -   `user`: Pembuat (Karyawan).
    -   `category`: Penggajian, Kehadiran, Teknis, Umum.
    -   `priority`: Rendah, Sedang, Tinggi, Mendesak.
    -   `status`: Terbuka, Dalam Proses, Selesai, Tertutup.
*   **Pesan Tiket (TicketMessage)**:
    -   Komunikasi berulir (threaded).
    -   `is_internal`: Boolean untuk catatan pribadi khusus staf.
*   **Lampiran Tiket (TicketAttachment)**:
    -   Unggahan file (Screenshot bug, bukti ketidaksesuaian gaji).

### Endpoint API
- `GET /api/tickets/`: Daftar tiket pengguna atau semua tiket tenant (untuk Admin).
- `POST /api/tickets/`: Membuat tiket baru.
- `POST /api/tickets/{id}/add_message/`: Membalas dalam utas (thread).
- `POST /api/tickets/{id}/resolve/`: Menandai sebagai selesai.

## 🎨 Persyaratan UI/UX
- **Dasbor Admin**: Pusat "Mission Control" bagi HR untuk mengelola permintaan volume tinggi.
- **Aplikasi Mobile**: Bagian "Bantuan & Dukungan" yang bersih dalam aplikasi ESS (Employee Self-Service).
- **Mikro-interaksi**: Lencana status real-time dan indikator pengetikan untuk utas dukungan yang aktif.

## 🔒 Keamanan & Privasi
- **Logging Audit**: Setiap perubahan status tiket dan pesan harus diaudit.
- **RBAC**: Karyawan hanya dapat melihat tiket mereka sendiri; Manajer HR melihat tiket untuk tenant mereka; Admin Global melihat semuanya.
