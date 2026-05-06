# Panduan Arsitektur Skalabilitas HRMS

Panduan ini menguraikan evolusi arsitektur yang diperlukan untuk menskalakan platform HRMS dari basis awal 10 ribu pengguna ke 100 ribu pengguna, dan akhirnya ke 1 Juta pengguna. Panduan ini juga memberikan analisis efisiensi biaya terkait pilihan infrastruktur (Bare-Metal/VPS vs. AWS).

## Penskalaan ke 100 Ribu Pengguna: VPS vs AWS

Saat mendekati angka 100.000 pengguna, pertanyaan umum muncul: *Haruskah kita bermigrasi ke AWS atau tetap menggunakan penyedia Bare-Metal/VPS (misalnya, Biznet, Hetzner)?*

Untuk platform HRMS, **tetap menggunakan penyedia Bare-Metal atau VPS berperforma tinggi sangat layak dilakukan dan jauh lebih efisien secara biaya** daripada bermigrasi ke AWS.

### Mengapa Bare-Metal/VPS Lebih Efisien Biaya pada 100 Ribu Pengguna
1. **Biaya Bandwidth (Transfer Data):** AWS mengenakan biaya besar untuk Transfer Data Keluar (Data Transfer Out). Sebuah HRMS menangani banyak unggahan/unduhan dokumen (CV, slip gaji, laporan). Penyedia bare-metal biasanya menawarkan kuota bandwidth tanpa batas atau sangat besar secara gratis.
2. **Biaya Komputasi:** Server khusus (misalnya, 64-Core / 256GB RAM) di penyedia seringkali 3x hingga 5x lebih murah daripada instans EC2 atau RDS yang setara.
3. **Kedaulatan Data:** Menyimpan data di pusat data lokal memastikan kepatuhan ketat terhadap peraturan privasi data regional.

### Kapan AWS Menjadi Pilihan yang Lebih Baik?
AWS dihargai karena **kenyamanan dan layanan terkelola**. Ini direkomendasikan hanya jika:
- Tim Anda tidak memiliki insinyur DevOps/Admin Sistem khusus untuk mengelola cluster High Availability (HA) secara manual.
- Anda memerlukan skalabilitas elastis ekstrem (menangani lonjakan lalu lintas mendadak 1000% dalam hitungan menit) dan kehadiran global.

### Pergeseran Arsitektur untuk 100 Ribu Pengguna (Penskalaan Horizontal)
Menskalakan ke 100 ribu pengguna memerlukan perpindahan dari pendekatan "Penskalaan Vertikal" (satu server besar) yang digunakan untuk 10 ribu pengguna. Arsitektur harus berevolusi menjadi **Penskalaan Horizontal**:

- **Load Balancer Khusus:** Memperkenalkan server proxy HAProxy atau Nginx di sisi depan untuk mendistribusikan lalu lintas secara merata ke seluruh node.
- **Server Aplikasi Multi-Node:** Menjalankan instans frontend dan backend yang terpisah di beberapa server menggunakan Docker Swarm atau Kubernetes.
- **High Availability (HA) Database:** Satu database menjadi satu titik kegagalan (single point of failure). Arsitektur memerlukan pengaturan Master-Replica (misalnya, menggunakan Patroni untuk PostgreSQL), di mana penulisan (write) masuk ke Master dan pembacaan (read) didistribusikan ke seluruh Replika.
- **Penyimpanan Objek Terpusat:** Volume Docker lokal (`media_volume`) tidak lagi dapat digunakan. File yang diunggah harus disimpan dalam Penyimpanan Objek yang kompatibel dengan S3 (seperti Biznet NEO Object Storage) untuk memastikan semua node aplikasi memiliki akses ke file yang sama.
- **Server Caching Khusus:** Redis harus diekstrak ke server memori tinggi miliknya sendiri untuk melayani semua node aplikasi.

---

## Penskalaan ke 1 Juta Pengguna: Batas Berikutnya

Meskipun arsitektur 100 ribu pengguna (Penskalaan Horizontal) menetapkan pondasi yang benar, menskalakan dari 100 ribu ke 1 Juta pengguna (peningkatan 10x lipat) memperkenalkan hambatan (bottleneck) yang sama sekali baru. Anda tidak bisa sekadar "menambah lebih banyak server" tanpa memodifikasi infrastruktur dasar dan logika aplikasi.

### Perbedaan Arsitektur Utama (100 Ribu vs 1 Juta)

#### 1. Hambatan Penulisan Database (Write Bottleneck)
- **Pada 100 Ribu:** Satu Master DB yang menangani semua penulisan (insert/update) biasanya sudah cukup.
- **Pada 1 Juta:** Satu Master DB akan kewalahan di bawah penulisan bersamaan yang masif (misalnya, jutaan karyawan melakukan clock-in pada jam 08:00 pagi secara bersamaan).
- **Solusinya:** **Sharding Database**. Anda harus membagi database secara horizontal, memisahkan tenant di beberapa cluster DB (misalnya, Tenant A-M di Cluster 1, Tenant N-Z di Cluster 2).

#### 2. Pemrosesan Pekerjaan Latar Belakang (Background Task Processing)
- **Pada 100 Ribu:** Antrean Redis + Celery yang sederhana sudah memadai untuk menangani tugas latar belakang seperti perhitungan gaji.
- **Pada 1 Juta:** Pemrosesan latar belakang massal (misalnya, pembuatan gaji akhir bulan untuk ribuan perusahaan) akan membuat instans Redis sederhana macet karena batas memori.
- **Solusinya:** Migrasi ke Message Broker tingkat perusahaan seperti **Apache Kafka** atau **RabbitMQ Cluster** untuk menangani throughput asinkron masif secara efisien.

#### 3. Monolith vs Microservices
- **Pada 100 Ribu:** Aplikasi monolitik modular cepat untuk dideploy dan mudah dikelola.
- **Pada 1 Juta:** Menskalakan seluruh monolit hanya untuk menangani lonjakan lalu lintas di satu modul tertentu (seperti Kehadiran) tidak efisien sumber daya dan berbahaya.
- **Solusinya:** Refactoring menjadi **Microservices**. Modul kritis (Kehadiran, Penggajian) diekstrak menjadi layanan mandiri yang dapat diskalakan secara independen dari sistem HR inti.

#### 4. Edge Caching dan CDN
- Pada 1 Juta pengguna, komputasi server lokal tidak boleh disia-siakan untuk melayani aset statis atau respons API yang dapat diprediksi. CDN tingkat perusahaan (seperti Cloudflare) harus diimplementasikan untuk menyimpan cache aset langsung di sisi depan, memblokir permintaan yang tidak perlu agar tidak pernah mencapai server asal.

### Ringkasan Strategi
Jangan melakukan over-engineering untuk 1 Juta pengguna di hari pertama. Fokuslah pada penguasaan **Arsitektur Penskalaan Horizontal 100 Ribu** terlebih dahulu. Setelah aplikasi benar-benar stateless (DB terpisah, Penyimpanan Objek terpisah, Load Balanced), transisi ke 1 Juta pengguna menjadi masalah sistematis dalam melakukan sharding database dan memecah microservices dari waktu ke waktu.
