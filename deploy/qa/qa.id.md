# Panduan Deployment QA - Cloud Providers

Dokumen ini berisi panduan langkah demi langkah (End-to-End) untuk melakukan deployment aplikasi HariKerja HRMS ke *Environment QA*. Kami memberikan rekomendasi untuk tiga penyedia cloud utama: **Biznet GIO**, **IDCloudHost**, dan **Hostinger**.

## Spesifikasi Server & Tujuan Environment

**Environment QA** berfungsi sebagai gerbang utama untuk verifikasi fungsional. Meskipun **Environment Staging** di masa depan akan digunakan untuk uji beban (load testing) akhir dan verifikasi kapasitas pengguna maksimal (saat ini dihilangkan), server QA didedikasikan untuk **Manual User Acceptance Testing (UAT)** dan verifikasi fungsional oleh pemangku kepentingan.

| Tier | vCPU | RAM | Storage | Tujuan Utama |
| :--- | :--- | :--- | :--- | :--- |
| **Saat Ini (Aktif)** | 8 Cores | 8 GB | 60 GB SSD | **Sementara Over-provisioned** (NEO Lite MM 8.8) |
| **Target Ideal** | 2 Cores | 4 GB | 60 GB SSD | **Dioptimalkan & Hemat Biaya untuk UAT Manual** |

> [!IMPORTANT]
> **Status Infrastruktur Saat Ini:** Saat ini kita menggunakan **Biznet GIO NEO Lite MM 8.8** (8 Core vCPU, 8 GB RAM). Meskipun memberikan daya komputasi yang sangat baik, ini **sangat berlebihan (overkill)** untuk sebuah environment QA internal. Sebagai referensi, environment Produksi-1K hanya menggunakan 4 Cores / 8 GB RAM untuk melayani 1.000 pengguna aktif. Oleh karena itu, kita berencana untuk **turun ke 2 Cores dan 4 GB RAM** (NEO Lite MS 4.2) pada siklus penagihan berikutnya untuk menghemat biaya bulanan sebesar 50-75%, dengan memanfaatkan **Swap 4 GB** agar proses deployment tetap stabil.

### 🧪 Penggunaan Environment QA & Verifikasi Fitur
Untuk memastikan semua fitur berfungsi dengan benar sebelum masuk ke produksi, environment QA digunakan untuk:

1.  **Manual User Acceptance Testing (UAT):** Pengguna nyata dan stakeholder memverifikasi alur kerja bisnis (Payroll, Presensi, Onboarding Karyawan).
2.  **Pengecekan Isolasi Multi-tenant:** Memastikan bahwa data antar skema perusahaan yang berbeda tetap terisolasi secara ketat dalam environment mirip cloud.
3.  **Sanity & Smoke Testing:** Pemeriksaan manual akhir pada skenario "Happy Path" setelah setiap deployment.
4.  **Integrasi Aplikasi Mobile:** Pengujian akhir aplikasi mobile Flutter terhadap endpoint API publik dengan HTTPS.
5.  **Pengecekan Kesamaan Environment:** Memverifikasi bahwa konfigurasi (Variabel Lingkungan, Nginx, SSL) konsisten dengan pengaturan Produksi-1K.

### Rekomendasi Paket Provider:
- **Biznet GIO:** Gunakan **NEO Lite MS 4.2** (2 Core, 4 GB RAM) - Target Ideal, atau **NEO Lite MM 8.8** (Saat Ini).
- **IDCloudHost:** Gunakan **NVMe 3** (2 Cores, 4 GB RAM) untuk pengujian manual hemat biaya.
- **Hostinger:** Gunakan **KVM 2** (2 Cores, 4 GB RAM) untuk performa pengujian manual yang stabil.

### Alasan Teknis untuk RAM 4GB + Swap 4GB:
Bahkan tanpa automated testing, kita mempertahankan kombinasi **RAM 4GB + Swap 4GB** sebagai target ideal untuk mendukung:
1.  **PostgreSQL & Redis Cache:** Operasi database dan caching yang pas untuk tim penguji internal berskala kecil.
2.  **Efisiensi Build Docker:** Memanfaatkan file Swap 4GB untuk menyediakan ruang memori virtual tambahan selama proses *build* Next.js (`npm run build`), mencegah kegagalan Out-Of-Memory (OOM).
3.  **Dukungan Konkurensi:** Mengizinkan 5-10 pemangku kepentingan untuk melakukan UAT secara bersamaan tanpa kendala.
4.  **Penyimpanan Media Lokal:** Menyimpan file unggahan secara lokal di volume Docker tanpa memerlukan kompleksitas dan biaya tambahan dari Biznet NEO Object Storage.

**Persyaratan Umum:**
- **OS yang Disarankan:** Ubuntu 22.04 LTS / 24.04 LTS
- **Domain QA:** `harikerja.web.id`
- **Pengaturan DNS:** Menggunakan **NEO DNS Manager** di dashboard Biznet GIO.

---

## Tahap 0: Konfigurasi DNS (Dashboard Biznet GIO)

Sebelum memulai di server, hubungkan domain Anda ke IP VPS Biznet:

1.  Dapatkan **Public IP** dari panel `Compute > harikerja-qa`.
2.  Masuk ke menu **Network > NEO DNS**.
3.  Pilih domain `harikerja.web.id`.
4.  Tambahkan **A Record** baru:
    *   **Host/Name:** `@` (atau kosongkan)
    *   **IP Address:** `[Isi IP VPS Anda]`
5.  Tambahkan **A Record (Wildcard)**:
    *   **Host/Name:** `*`
    *   **IP Address:** `[Isi IP VPS Anda]` (Sama dengan di atas)
    *   *Fungsi: Agar sub-domain tenant seperti `perusahaan1.harikerja.web.id` otomatis terhubung.*

---

## Tahap 1: Persiapan Awal Server (Provisioning)

### 1. Update OS & Install Basic Dependencies
Akses server VPS Anda menggunakan SSH (sebagai root atau pengguna dengan hak akses sudo), lalu jalankan:

```bash
# Update repository & upgrade default packages
sudo apt update && sudo apt upgrade -y

# Install essential utilities
sudo apt install -y curl wget git vim htop ufw
```

### 2. Setup Swap Memory (Wajib untuk RAM 4GB)
Karena target optimal menggunakan RAM fisik 4GB, penambahan Swap 4GB bersifat **wajib** untuk memastikan proses build Docker tidak mengalami error Out-of-Memory (OOM) selama proses build Next.js (praktik terbaik untuk Server Docker):

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Buat permanen di fstab
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 3. Konfigurasi Firewall (UFW)
Kita hanya akan membuka port yang diperlukan:
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

---

## Tahap 2: Instalasi Infrastruktur Inti (Docker & Nginx)

### 1. Install Docker & Docker Compose (Repo Resmi)
Gunakan metode repositori resmi Docker untuk mendapatkan versi terbaru dan paling stabil:

```bash
# 1. Update list paket & Install dependencies awal
sudo apt update && sudo apt install -y ca-certificates curl gnupg

# 2. Tambahkan kunci GPG resmi Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# 3. Tambahkan repository Docker ke Apt sources
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 4. Install Docker Engine & Compose Plugin
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 5. Kelola Docker sebagai user non-root
# Agar Anda tidak perlu mengetik 'sudo' setiap kali menjalankan perintah docker
sudo usermod -aG docker $USER

# PENTING: Anda harus LOGOUT dan LOGIN kembali ke SSH agar perubahan grup ini aktif.
```

### 2. Install Nginx & Certbot
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

---

## Tahap 3: Clone Repository & Konfigurasi (*Environment*)

### 1. Download Source Code HRMS
```bash
# Contoh direktori project: /opt/hrms
sudo mkdir -p /opt/hrms
sudo chown -R $USER:$USER /opt/hrms
git clone <URL_REPOSITORY_ANDA> /opt/hrms
cd /opt/hrms
```

### 2. Siapkan File Eksekusi & Environment
Buka folder `environments/`, lalu siapkan file konfigurasi berdasarkan `.env.example` atau `.env.staging`:

```bash
cp environments/.env.example environments/.env.local
nano environments/.env.local
```

Isi konfigurasi kunci berikut untuk mode QA:
```ini
# --- CORE API ---
DEBUG=False
SECRET_KEY=isi-dengan-kunci-rahasia-acak-yang-panjang
ALLOWED_HOSTS=.harikerja.web.id,localhost,127.0.0.1
CSRF_TRUSTED_ORIGINS=https://*.harikerja.web.id

# --- TENANT SETTINGS ---
TENANT_DOMAIN_SUFFIX=harikerja.web.id

# --- DATABASE ---
POSTGRES_DB=hrms_qa
POSTGRES_USER=hrms_qa_user
POSTGRES_PASSWORD=password_db_rahasia
POSTGRES_HOST=db
POSTGRES_PORT=5432

# --- FRONTEND ---
NEXT_PUBLIC_API_URL=https://harikerja.web.id/api

# --- EMAIL & CELERY ---
ENABLE_EMAIL_NOTIFICATIONS=True
EMAIL_HOST_USER=email-anda@gmail.com
EMAIL_HOST_PASSWORD=app-password-anda
DEFAULT_FROM_EMAIL=noreply@harikerja.web.id
REDIS_URL=redis://redis:6379/1
```

---

## Tahap 4: Proses Build dan Deploy

Kita akan menggunakan `docker-compose.yml` utama karena spesifikasi yang direkomendasikan (RAM 8GB) sangat mumpuni untuk menangani fitur batasan isolasi sumber daya.

### 1. Jalankan Deployment Aman (Sangat Direkomendasikan)
Kami telah menyediakan script `deploy/qa/deploy_qa.sh` yang menangani seluruh proses update dengan aman dalam satu perintah.

**Apa saja yang terjadi saat proses deployment aman ini dijalankan:**
- **Tahap 0 (Stabilitas SSH):** Mengubah konfigurasi SSH server agar terminal tidak mati atau putus (freeze) di tengah jalan karena proses deployment yang lama.
- **Tahap 1 (Backup):** Melakukan pencadangan database secara otomatis sebelum ada kode yang diubah. Jika backup gagal, deployment langsung dibatalkan.
- **Tahap 2 (Update Kode):** Menarik pembaruan kode sumber (source code) terbaru dari repositori Git.
- **Tahap 3 (Deployment):** Mematikan container dan jaringan lama, kemudian melakukan *build* ulang secara paksa dan menjalankan container baru dengan kode mutakhir.
- **Tahap 4 (Migrasi Database):** Mengeksekusi perubahan skema database (Django Migrations) baik untuk skema utama maupun seluruh skema tenant. Juga menjalankan inisialisasi tenant QA.
- **Tahap 5 (Pengujian Unit):** *(Saat ini dinonaktifkan)* Menjalankan `pytest` untuk memverifikasi fungsionalitas kode secara otomatis.
- **Tahap 6 (Cek Kesehatan/Smoke Test):** Menunggu layanan aktif, lalu memanggil endpoint kesehatan API (`/api/health/`) untuk memastikan aplikasi telah menyala dan dapat diakses dengan benar.
- **Tahap 7 (Pembersihan):** Menghapus image Docker yang lama dan tidak terpakai (dangling images) untuk menghemat kapasitas penyimpanan.

**Cara Penggunaan:**
*   **Deployment Default (VPN-Only / Tanpa Cloudflare - Sangat Direkomendasikan jika Cloudflare belum siap):**
    ```bash
    ./deploy/qa/deploy_qa.sh
    ```
*   **Deployment dengan Mengaktifkan Cloudflare Tunnel (Zero Trust):**
    ```bash
    ./deploy/qa/deploy_qa.sh --with-cloudflare
    # atau menggunakan alias singkat:
    ./deploy/qa/deploy_qa.sh -c
    ```

### 2. Alternatif Manual (Jika diperlukan)
Jika Anda lebih suka menjalankan langkah-langkahnya secara manual atau menggunakan *Makefile* bawaan:
```bash
make qa
```
*(Atau jalankan secara manual melalui Docker Compose:)*
```bash
docker compose --env-file deploy/environments/.env.qa up -d --build
```

Proses build akan memakan waktu sekitar **2 - 5 menit**. Anda bisa memantau konsumsi RAM menggunakan perintah `htop` di jendela terminal lain secara bersamaan.

### 3. Menjalankan Perintah Administratif & Tugas Django

Untuk menjalankan script Django shell, migrasi database, pemeriksaan sistem, dan lingkungan interaktif di server QA, silakan lihat **[Panduan Operasional & Diagnostik Server QA](../../docs/technical_specs/qa_operations_guide.id.md)**.

Semua perintah wajib dijalankan dari direktori root proyek. Sebagai contoh, jika Anda perlu menjalankan migrasi secara manual atau mengakses skema database:
```bash
# Masuk ke backend shell menggunakan konfigurasi compose QA
docker compose -f deploy/qa/docker-compose.qa.yml exec backend bash

# Jalankan migrasi shared tenant
python manage.py migrate_schemas --shared

# Buat tenant utama jika setup gagal
python manage.py create_tenant --schema_name=public --name="HariKerja QA Master" --domain-domain=harikerja.web.id --is_primary=True
```

---

## Tahap 5: Konfigurasi Nginx (Containerized)

**PENTING:** Sejak standarisasi terbaru, kita menggunakan **Nginx di dalam Docker** (terintegrasi di `docker-compose.qa.yml`) untuk isolasi maksimal. Anda tidak perlu menginstall Nginx di host server kecuali jika ingin menggunakannya sebagai *Load Balancer* tambahan.

Jika Anda tetap ingin menggunakan Nginx di host (Legacy Mode), gunakan konfigurasi berikut:
Buat file konfigurasi spesifik:
```bash
sudo nano /etc/nginx/sites-available/hrms_qa
```

Masukkan kode *Reverse Proxy* berikut:
```nginx
server {
    listen 80;
    server_name harikerja.web.id *.harikerja.web.id;

    # Bypass static file max payload
    client_max_body_size 100M;

    # Backend API Routing (Django Rest Framework)
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend Admin Panel
    location /admin/ {
        proxy_pass http://127.0.0.1:8000/admin/;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files (for Django Admin CSS/JS)
    location /static/ {
        proxy_pass http://127.0.0.1:8000/static/;
        proxy_set_header Host $http_host;
    }

    # Media files (for user uploads)
    location /media/ {
        proxy_pass http://127.0.0.1:8000/media/;
        proxy_set_header Host $http_host;
    }

    # Frontend Routing (Next.js)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Security Headers
        add_header X-Frame-Options "SAMEORIGIN";
        add_header X-XSS-Protection "1; mode=block";
        add_header X-Content-Type-Options "nosniff";

        # WebSocket support for Next.js Hot Reload (Opsional di QA)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 2. Aktifkan dan Test Nginx
```bash
sudo ln -s /etc/nginx/sites-available/hrms_qa /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Setup Wildcard SSL (*Let's Encrypt*)
Untuk aplikasi *Multi-Tenant* (SaaS), kita wajib menggunakan *Wildcard SSL* (`*.harikerja.web.id`).

```bash
sudo certbot certonly --manual --preferred-challenges=dns --email admin@harikerja.web.id --server https://acme-v02.api.letsencrypt.org/directory --agree-tos -d harikerja.web.id -d *.harikerja.web.id
```

> **PENTING (Langkah Biznet DNS)**:
> Certbot akan memberikan kode *TXT record* (misal: `_acme-challenge.harikerja.web.id`). 
> 1. Salin kode tersebut.
> 2. Masuk ke **NEO DNS Manager** di Biznet GIO.
> 3. Tambahkan record baru: Type **TXT**, Name `_acme-challenge`, Value `[Kode dari Certbot]`.
> 4. Tunggu 1-2 menit, lalu tekan `Enter` di terminal.

Setelah sertifikat berhasil dibuat, Nginx di dalam Docker akan otomatis membacanya jika file sertifikat di-*mount* ke dalam kontainer (cek `docker-compose.qa.yml`).

---

## Tahap 6: Verifikasi & UAT (*User Acceptance Testing*)

Jika semua langkah berhasil, validasi dari Browser Anda:
1. Akses `https://harikerja.web.id` -> Harus menampilkan *Landing Page / Admin Panel Login* Next.js.
2. Akses `https://harikerja.web.id/api/schema/swagger-ui/` -> Harus menampilkan dokumentasi API Django tanpa error SSL.

---

## Tahap 7: Maintenance & Backup Otomatis

Karena Anda mengelola ini sendiri, menjaga keamanan data adalah prioritas. Kami telah menyediakan script backup untuk mengotomatiskannya.

### 1. Script Backup Database
Kita menggunakan script `deploy/qa/backup_qa.sh`. Script ini sudah memiliki fitur **First-Deploy Safety**:
- Mengecek apakah database sedang berjalan.
- Jika kontainer belum ada (saat baru pertama kali setup), script akan melewati backup tanpa error sehingga proses deploy tetap lanjut.
- Jika kontainer aktif, akan dibuat file `.sql.gz` di folder `backups/`.
- Otomatis menghapus backup yang lebih tua dari 7 hari.

**Cara menjalankan manual:**
```bash
# Pastikan Anda berada di root project
./deploy/qa/backup_qa.sh
```

### 2. Otomatisasi Backup dengan Cron
Untuk memastikan data Anda selalu aman tanpa intervensi manual, atur cron job untuk menjalankan backup setiap malam (misal, jam 02:00 pagi).

1. Buka editor crontab:
   ```bash
   crontab -e
   ```
2. Tambahkan baris berikut di bagian bawah (sesuaikan path dengan lokasi project Anda):
   ```bash
   0 2 * * * /opt/hrms/deploy/qa/backup_qa.sh >> /opt/hrms/backups/backup_log.log 2>&1
   ```

### 3. Membersihkan Ruang Penyimpanan (Docker)
Docker dapat menghabiskan SSD Anda dengan cepat. Jalankan ini setiap bulan:
```bash
# Hapus image, container, dan network yang tidak terpakai
docker system prune -a --volumes -f

# Cek folder mana yang berat
du -sh /var/lib/docker
```

### 4. Mengecek Penggunaan Sumber Daya (Resource Usage)
```bash
# Tampilan langsung (live view) CPU/RAM container
docker stats

# Tampilan langsung (live view) sistem server
htop
```

---

## Tahap 8: Troubleshooting (Cheat Sheet)

| Masalah | Kemungkinan Penyebab | Solusi |
|---|---|---|
| **502 Bad Gateway** | Container Backend/Frontend DOWN. | Jalankan `docker ps` untuk melihat apakah container berjalan. Jika tidak, `docker compose up -d`. |
| **403 Forbidden** | Nginx permission atau Django CSRF. | Cek `CSRF_TRUSTED_ORIGINS` di `.env.local`. |
| **Disk Full** | Docker logs atau build cache penuh. | Jalankan `docker system prune -f`. |
| **SSL Errors** | Sertifikat kedaluwarsa atau DNS berubah. | Jalankan `sudo certbot renew`. |

---

Proses **QA Deployment ke Cloud Server** telah selesai. Tim *Tester* dapat mulai menjalankan skenario pengujian! 🚀
