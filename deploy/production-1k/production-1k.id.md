# Produksi 1K - Panduan Penskalan Ideal (1.000 Pengguna)

Dokumen ini menguraikan spesifikasi ideal untuk menangani **1.000 pengguna aktif** di bawah beban penuh, yang dioptimalkan secara khusus untuk puncak konkurensi (peak concurrency) selama jam masuk/keluar kerja (check-in/check-out) dan pemrosesan penggajian bulanan (payroll).

## 🖥️ Spesifikasi Server Ideal

Untuk memastikan aplikasi tetap sangat responsif, konfigurasi "Sweet Spot" berikut sangat direkomendasikan:

| Komponen | Spesifikasi Ideal | Rasional / Analisis |
| :--- | :--- | :--- |
| **vCPU** | 4 Cores (Dedicated) | Cukup untuk menangani worker Gunicorn dan background task Celery secara bersamaan tanpa perebutan CPU. |
| **RAM** | 8 GB | Batas minimum yang aman jika dialokasikan secara ketat. Sangat disarankan untuk membatasi memori container agar tidak memicu crash OOM (Out of Memory). |
| **Storage** | 80 GB NVMe SSD | IOPS tinggi wajib digunakan untuk mencegah bottleneck I/O selama penulisan database frekuensi tinggi (misal: check-in massal). |
| **Network** | 1 Gbps Shared (Public) | Jalur berkecepatan tinggi dari Biznet GIO memastikan nol bottleneck selama jam puncak kehadiran (port 10 Gbps tersedia secara internal untuk interkoneksi VPC privat). |

### Penyedia Layanan yang Direkomendasikan:
- **Biznet GIO**: **NEO Lite Pro MM.8.4** (4 vCPU AMD EPYC™ 3.1 GHz, 8GB RAM, 80GB NVMe). 
  *   *Pilihan terbaik untuk keseimbangan kinerja/biaya di Indonesia.*
  *   *IOPS dedicated dan CPU berkecepatan tinggi memastikan latensi minimal selama jam puncak masuk kerja.*
- **Hetzner**: **CCX21** (4 Dedicated Cores, 8GB RAM, 80GB NVMe).
  *   *Alternatif luar biasa jika latensi lokal Indonesia tidak menjadi perhatian utama.*

---

## 🛠️ Optimalisasi Performa (Performance Tuning)

Optimalisasi berikut diterapkan untuk memaksimalkan efisiensi setup 4 Core / 8 GB RAM agar terhindar dari crash akibat kekurangan memori (OOM):

### 1. Backend (Django/Gunicorn)
- **Workers**: 5 Workers (Formula: `(1 x 4 Cores) + 1`).
  *   *Rasional*: Setiap worker Gunicorn Django mengonsumsi sekitar 150MB - 200MB RAM. Dengan menggunakan Gunicorn dengan class worker `gevent` (asinkron), 5 worker sudah lebih dari cukup untuk menangani ribuan koneksi bersamaan tanpa membebani RAM (mengonsumsi total ~900MB RAM, dibanding konfigurasi 9 worker yang memakan ~1.8GB RAM).
- **Timeout**: 120 detik (Untuk mencegah timeout selama ekspor laporan payroll yang berat).

### 2. Database (PostgreSQL)
Konfigurasi disesuaikan di `.env.production_1k`:
- `POSTGRES_SHARED_BUFFERS`: **1 GB** (Dioptimalkan agar pas dengan limit container Docker `DB_MEM_LIMIT=2.5G`). Pengaturan sebelumnya sebesar 2GB sangat berisiko memicu crash OOM pada container database karena tidak menyisakan ruang bagi `work_mem` dan overhead koneksi.
- `POSTGRES_MAX_CONNECTIONS`: **100** (Diturunkan dari 200 karena PgBouncer bertindak sebagai pooler koneksi di depan DB).
- `POSTGRES_WORK_MEM`: **32 MB** (Alokasi memori per query).

### 3. Background Processing (Celery)
- **Concurrency**: 4 workers (Menggunakan limit container `1G` secara efisien).
- Tugas: Pengiriman email massal, pembuatan PDF slip gaji, dan push notifications.

### 4. Reverse Proxy (Nginx)
- **Kompresi Gzip**: Level 6 (Keseimbangan optimal antara beban CPU dan bandwidth).
- **Client Max Body Size**: 50MB (Mendukung unggahan foto kehadiran beresolusi tinggi).

---

## 📂 Struktur Deployment
Direktori `deploy/production-1k/` berisi:
1. `docker-compose.1k.yml`: Orkestrasi container yang telah dikonfigurasi.
2. `nginx.conf`: Pengaturan reverse proxy Nginx yang dituning untuk produksi.
3. `deploy_1k_production.sh`: Script deployment otomatis zero-downtime dengan smoke test kesehatan API.
4. `backup_1k.sh`: Otomatisasi backup database harian/jam-an.

---

## 🔒 Keamanan & Pemeliharaan
1. **Backup**: Jalankan `backup_1k.sh` via Cron setiap hari pukul 02:00 AM.
2. **SSL**: Selalu gunakan Wildcard SSL via Let's Encrypt untuk isolasi multi-tenant.
3. **OS**: Direkomendasikan Ubuntu 22.04 LTS / 24.04 LTS.

---

## 💡 Catatan Analisis Mendalam (Expert Recommendations)

### A. Strategi Penyimpanan File Media (Biznet GIO NEO Object Storage)
Untuk 1.000 pengguna aktif yang melakukan check-in dan check-out setiap hari dengan verifikasi foto wajah (selfie):
- Estimasi 2.000 log kehadiran/hari. Jika 50% memerlukan unggahan foto (ukuran rata-rata terkompresi ~200 KB):
  *   **Harian**: `1.000 foto * 200 KB = 200 MB/hari`
  *   **Bulanan (20 hari kerja)**: `200 MB * 20 = 4 GB/bulan`
  *   **Tahunan**: `4 GB * 12 = 48 GB/tahun`
- Dengan kapasitas SSD lokal sebesar 80 GB yang juga harus menampung OS, Docker image, log sistem, dan database PostgreSQL yang terus berkembang, penyimpanan lokal akan habis dalam waktu kurang dari 1 tahun.
- **Rekomendasi Utama**: Aktifkan `USE_S3=True` di `.env.production_1k` dan gunakan **Biznet GIO NEO Object Storage (NOS)** untuk menyimpan file statis dan media. Ini akan menghemat penyimpanan NVMe SSD server Anda, menurunkan disk I/O, dan menjaga reliabilitas sistem jangka panjang.

### B. Konflik Port Binding SSL (Port 443)
- Pada `docker-compose.1k.yml`, port `443:443` diexpose pada service Nginx. Namun, `nginx.conf` di dalam container hanya mendengarkan port 80 dan tidak mengonfigurasi sertifikat SSL.
- **Skenario Solusi**:
  1. **SSL Terminated on Host (Direkomendasikan)**: Instal Certbot Nginx di server host VPS Anda untuk menangani SSL port 443. Kemudian, host Nginx akan mem-forward trafik HTTP biasa ke container Nginx di port internal (misal port 80). Jika menggunakan skenario ini, hapus mapping port `443:443` di `docker-compose.1k.yml` untuk menghindari bentrok binding port dengan host.
  2. **SSL Terminated inside Docker Container**: Mount folder SSL certs `/etc/letsencrypt` dari host ke container Nginx via volumes di `docker-compose.1k.yml`, lalu perbarui `nginx.conf` untuk mendengarkan port 443 dengan konfigurasi `ssl_certificate` dan `ssl_certificate_key`.
