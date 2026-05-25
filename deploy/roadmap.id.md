# HariKerja HRMS - Peta Jalan (Roadmap) Infrastruktur & Deployment

Dokumen ini menjelaskan rencana pertumbuhan strategis untuk infrastruktur platform HariKerja HRMS, beralih dari fase awal QA (Quality Assurance) ke peluncuran skala kecil, pertumbuhan skala menengah, hingga skala enterprise dengan lalu lintas tinggi.

---

## 📍 Fase 1: Quality Assurance (Saat Ini)

*   **Target**: Verifikasi internal, UAT manual, demonstrasi pemangku kepentingan (stakeholder), dan integrasi API.
*   **Infrastruktur**: VPS Single-Instance (Biznet GIO / IDCloudHost / Hostinger).
*   **Spesifikasi**:
    *   **Aktif Saat Ini**: 8 Core, 8 GB RAM (Biznet NEO Lite MM 8.8) — *Over-provisioned Sementara*.
    *   **Target Ideal (Dioptimalkan)**: 2 Core, 4 GB RAM + 4 GB Swap File (Biznet NEO Lite MS 4.2) — *Dioptimalkan biayanya untuk UAT manual, menghemat 50% hingga 75% biaya hosting*.
*   **Fitur Utama**:
    *   Penyimpanan lokal untuk media/unggahan (Docker volume).
    *   Instance database PostgreSQL tunggal dengan skema multi-tenant.
    *   Nginx proxy terintegrasi Docker dengan wildcard Let's Encrypt SSL.
    *   Pencadangan (backup) harian otomatis dengan batas penyimpanan 7 hari.
*   **Tujuan**: Stabilitas fungsional 100% dan validasi logika bisnis inti.

---

## 🚀 Fase 1.5: Production 1K (Sweet Spot)

*   **Target**: Peluncuran awal klien hingga **1.000 pengguna aktif**.
*   **Infrastruktur**: VPS Single-Instance Kinerja Tinggi (Biznet GIO / Hetzner).
*   **Spesifikasi**: 4 Core, 8 GB RAM, 80 GB NVMe SSD (Biznet NEO Lite Pro MM.8.4 atau Hetzner CCX21).
*   **Fitur Utama**:
    *   **Connection Pooling**: Integrasi PgBouncer untuk meningkatkan efisiensi koneksi database (mengurangi koneksi DB aktif menjadi 50 koneksi, mendukung hingga 500 koneksi klien).
    *   **Konkurensi Backend**: Gunicorn dioptimalkan dengan 5 worker gevent asinkron.
    *   **Offloading Media**: Integrasi langsung dengan object storage yang kompatibel dengan S3 (Biznet GIO NEO Object Storage) menggunakan protokol standar S3, menghemat kapasitas NVMe SSD dan bandwidth jaringan VPS.
*   **Tujuan**: Peluncuran produksi awal yang ramping, sangat stabil, dan tanpa bottleneck.

---

## ⚡ Fase 2: Production 10K (Kluster VPS Skala Menengah)

*   **Target**: Fase pertumbuhan skala menengah hingga **10.000 pengguna aktif**.
*   **Infrastruktur**: Kluster VPS kinerja tinggi (Node komputasi terdedikasi atau VPS yang diskalakan secara vertikal).
*   **Spesifikasi**: 16 Core, 32 GB – 64 GB RAM, penyimpanan NVMe berkecepatan tinggi.
*   **Fitur Utama**:
    *   Konfigurasi Nginx terdepan yang diperkeras (hardened).
    *   PostgreSQL yang telah ditala (Shared Buffers dioptimalkan sesuai batas RAM host).
    *   Klusterisasi PgBouncer untuk throughput tinggi.
    *   Pencadangan off-site harian otomatis ke bucket Object Storage yang redundan.
*   **Tujuan**: Kinerja maksimal, throughput tinggi, dan efisiensi biaya selama fase pertumbuhan.

---

## ☁️ Fase 3: Enterprise AWS (Skala Elastis)

*   **Target**: Klien korporat (enterprise) dengan **100.000+ pengguna aktif** dan kebutuhan High-Availability (Ketersediaan Tinggi).
*   **Infrastruktur**: Amazon Web Services (AWS Cloud).
*   **Arsitektur**:
    *   **Komputasi**: AWS EKS (Elastic Kubernetes Service) untuk orkestrasi kontainer dan penskalaan otomatis (auto-scaling).
    *   **Database**: Amazon RDS untuk PostgreSQL (Multi-AZ dengan read-replica).
    *   **Caching**: Amazon ElastiCache untuk Redis (Kluster).
    *   **Penyimpanan**: Amazon S3 dengan CloudFront CDN untuk distribusi media global berlatensi rendah.
*   **Tujuan**: Penskalaan horizontal tak terbatas, redundansi geografis, dan SLA Uptime 99,9%.

---

### Mengapa Memilih Fase VPS 1K dan 10K?

Beralih langsung ke arsitektur cloud terkelola (seperti AWS) untuk 1.000 hingga 10.000 pengguna seringkali memakan biaya sangat besar dan terlalu rumit bagi startup yang sedang berkembang. Model VPS yang diskalakan secara vertikal/dioptimalkan memberikan:
1.  **Rasio Performa-ke-Harga Unggul**: VPS NVMe modern seringkali mengungguli RDS cloud kelas entri dalam kinerja CPU murni dan latensi I/O.
2.  **Biaya yang Dapat Diprediksi**: Biaya bulanan tetap mencegah kejutan tagihan dari penggunaan variabel cloud.
3.  **Pemeliharaan yang Sederhana**: Infrastruktur satu titik (single-point) memungkinkan tim pengembang yang kecil dan tangkas untuk fokus sepenuhnya pada fitur aplikasi daripada orkestrasi kluster.
