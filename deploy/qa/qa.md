# QA Deployment Guide - Cloud Providers

This document contains a step-by-step (End-to-End) guide to deploy the harikerja HRMS application to the *QA Environment*. We provide recommendations for three major providers: **Biznet GIO**, **IDCloudHost**, and **Hostinger**.

## Server Specifications & Environment Purpose

The **QA Environment** serves as the primary gateway for functional verification. While a future **Staging Environment** will be used for final load testing and maximum user capacity verification (currently omitted), the QA server is dedicated to **Manual User Acceptance Testing (UAT)** and functional stakeholder verification.

| Tier | vCPU | RAM | Storage | Primary Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Current (Active)** | 8 Cores | 8 GB | 60 GB SSD | **Temporary Over-provisioned** (NEO Lite MM 8.8) |
| **Target Ideal** | 4 Cores | 8 GB | 60 GB SSD | **Optimized for Manual UAT & Sanity Checks** |

> [!IMPORTANT]
> **Current Infrastructure Status:** We are currently utilizing the **Biznet GIO NEO Lite MM 8.8** (8 Core vCPU, 8 GB RAM). While providing excellent compute power, we plan to **downgrade to 4 Cores** in the next billing cycle to optimize costs, as 4 Cores is more than sufficient for manual UAT workloads.

### 🧪 QA Environment Usage & Feature Verification
To ensure all features work correctly before hitting production, the QA environment is used for:

1.  **Manual User Acceptance Testing (UAT):** Real users and stakeholders verify business workflows (Payroll, Attendance, Employee Onboarding).
2.  **Multi-tenant Isolation Check:** Ensuring that data between different company schemas remains strictly isolated in a cloud-like environment.
3.  **Sanity & Smoke Testing:** A final manual walkthrough of "Happy Path" scenarios after every deployment.
4.  **Mobile App Integration:** Final testing of the Flutter mobile app against a public HTTPS API endpoint.
5.  **Environment Parity Check:** Verifying that configurations (Env Vars, Nginx, SSL) are consistent with the Production-1K setup.

### Provider Plan Recommendations:
- **Biznet GIO:** Use **NEO Lite MM 8.4** (Ideal Target) or **NEO Lite MM 8.8** (Current).
- **IDCloudHost:** Use **NVMe 5** for high-speed database interactions.
- **Hostinger:** Use **KVM 4** for stable manual testing performance.

### Technical Rationale for 8GB RAM:
Even without automated testing, we maintain **8GB RAM** as the ideal target to support:
1.  **PostgreSQL Buffer Cache:** High-performance multi-tenant database operations (seeding, resets, and tenant isolation tests).
2.  **Docker Build Efficiency:** Providing enough memory overhead for the Next.js production build process during deployments.
3.  **Concurrency Support:** Allowing multiple stakeholders to perform UAT simultaneously without performance degradation.
4.  **System Stability:** Ensuring enough headroom for the OS, Redis, and Celery background workers to run concurrently with the core app.

**General Requirements:**
- **Recommended OS:** Ubuntu 22.04 LTS / 24.04 LTS
- **QA Domain:** `harikerja.web.id`
- **DNS Setup:** Menggunakan **NEO DNS Manager** di dashboard Biznet GIO.
---

## Stage 0: DNS Configuration (Biznet GIO Dashboard)

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

## Stage 1: Initial Server Provisioning

### 1. Update OS & Install Basic Dependencies
Access your VPS server using SSH (as root or a user with sudo privileges), then run:

```bash
# Update repository & upgrade default packages
sudo apt update && sudo apt upgrade -y

# Install essential utilities
sudo apt install -y curl wget git vim htop ufw
```

### 2. Setup Swap Memory (Optional but Recommended)
Although the NEO Lite MM 8.4 package has an ideal 8GB RAM, adding a 4GB Swap will provide an extra layer of security (a best practice for Docker Servers):

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make it permanent in fstab
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 3. Firewall Configuration (UFW)
We will only open the necessary ports:
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

---

## Stage 2: Core Infrastructure Installation (Docker & Nginx)

### 1. Install Docker & Docker Compose (Official Repo)
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

## Stage 3: Clone Repository & Configuration (*Environment*)

### 1. Download HRMS Source Code
```bash
# Example project directory: /opt/hrms
sudo mkdir -p /opt/hrms
sudo chown -R $USER:$USER /opt/hrms
git clone <YOUR_REPOSITORY_URL> /opt/hrms
cd /opt/hrms
```

### 2. Prepare Execution Files & Environment
Open the `environments/` folder, then prepare the configuration file based on `.env.example` or `.env.staging`:

```bash
cp environments/.env.example environments/.env.local
nano environments/.env.local
```

Fill in the following key configurations for QA mode:
```ini
# --- CORE API ---
DEBUG=False
SECRET_KEY=fill-with-a-very-long-and-random-secret-key
ALLOWED_HOSTS=.harikerja.web.id,localhost,127.0.0.1
CSRF_TRUSTED_ORIGINS=https://*.harikerja.web.id

# --- TENANT SETTINGS ---
TENANT_DOMAIN_SUFFIX=harikerja.web.id

# --- DATABASE ---
POSTGRES_DB=hrms_qa
POSTGRES_USER=hrms_qa_user
POSTGRES_PASSWORD=very_secret_db_password
POSTGRES_HOST=db
POSTGRES_PORT=5432

# --- FRONTEND ---
NEXT_PUBLIC_API_URL=https://harikerja.web.id/api

# --- EMAIL & CELERY ---
ENABLE_EMAIL_NOTIFICATIONS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=noreply@harikerja.web.id
REDIS_URL=redis://redis:6379/1
```

---

## Stage 4: Build and Deploy Process

We will use the primary `docker-compose.yml` because the recommended specifications (8GB RAM) are highly capable of handling the resource isolation limits feature.

### 1. Run Safe Deployment (Recommended)
We have provided a script `deploy/qa/safe_deploy_qa.sh` which handles the entire update process safely in one command:
- Runs a Database Backup (via `backup_qa.sh`).
- Pulls the latest code (`git pull`).
- Rebuilds the Docker images.
- Runs the Database Migrations.
- **Starts Celery Worker** for background tasks (Email/Notifications).

**Usage:**
```bash
./deploy/qa/safe_deploy_qa.sh
```

### 2. Manual Alternative (If needed)
If you prefer to run steps manually or are using the built-in *Makefile*:
```bash
make qa
```
*(Or you can run it manually via Docker Compose:)*
```bash
docker compose --env-file deploy/environments/.env.qa up -d --build
```

The build process will take about **2 - 5 minutes**. You can monitor the RAM consumption using the `htop` command in a separate terminal window simultaneously.

### 2. Run Django-Tenants Migrations
Once all containers are active, enter the `backend` container and run migrations on the *Public Schema* (Main tenant):

```bash
docker compose exec backend bash
python manage.py migrate_schemas --shared
python manage.py create_tenant --schema_name=public --name="harikerja QA Master" --domain-domain=harikerja.web.id --is_primary=True
```

---

## Stage 5: Nginx Configuration (Containerized)

**PENTING:** Sejak standarisasi terbaru, kita menggunakan **Nginx di dalam Docker** (terintegrasi di `docker-compose.qa.yml`) untuk isolasi maksimal. Anda tidak perlu menginstall Nginx di host server kecuali jika ingin menggunakannya sebagai *Load Balancer* tambahan.

Jika Anda tetap ingin menggunakan Nginx di host (Legacy Mode), gunakan konfigurasi berikut:
Create a specific configuration file:
```bash
sudo nano /etc/nginx/sites-available/hrms_qa
```

Insert the following *Reverse Proxy* code:
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

        # WebSocket support for Next.js Hot Reload (Optional in QA)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 2. Enable and Test Nginx
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

## Stage 6: Verification & UAT (*User Acceptance Testing*)

If all steps are successful, validate from your Browser:
1. Access `https://harikerja.web.id` -> It should display the Next.js *Landing Page / Admin Panel Login*.
2. Access `https://harikerja.web.id/api/schema/swagger-ui/` -> It should display the Django API documentation tanpa SSL errors.

---

## Stage 7: Maintenance & Automated Backups

Since you are managing this alone, keeping the data safe is a priority. We have provided a backup script to automate this.

### 1. Database Backup Script
Kita menggunakan script `deploy/qa/backup_qa.sh`. Script ini sudah memiliki fitur **First-Deploy Safety**:
- Mengecek apakah database sedang berjalan.
- Jika kontainer belum ada (saat baru pertama kali setup), script akan melewati backup tanpa error sehingga proses deploy tetap lanjut.
- Jika kontainer aktif, akan dibuat file `.sql.gz` di folder `backups/`.
- Otomatis menghapus backup yang lebih tua dari 7 hari.

**How to run manually:**
```bash
# Make sure you are in the project root
./deploy/qa/backup_qa.sh
```

### 2. Automating Backups with Cron
To ensure your data is always safe without manual intervention, set up a cron job to run the backup every night (e.g., at 02:00 AM).

1. Open the crontab editor:
   ```bash
   crontab -e
   ```
2. Add the following line at the bottom (adjust the path to your actual project location):
   ```bash
   0 2 * * * /opt/hrms/deploy/qa/backup_qa.sh >> /opt/hrms/backups/backup_log.log 2>&1
   ```

### 3. Cleaning Disk Space (Docker)
Docker can eat up your SSD quickly. Run this monthly:
```bash
# Remove unused images, containers, and networks
docker system prune -a --volumes -f

# Check which folders are heavy
du -sh /var/lib/docker
```

### 4. Checking Resource Usage
```bash
# Live view of container CPU/RAM
docker stats

# Live view of server system
htop
```

---

## Stage 8: Troubleshooting (Cheat Sheet)

| Issue | Likely Cause | Solution |
|---|---|---|
| **502 Bad Gateway** | Backend/Frontend container is DOWN. | Run `docker ps` to see if containers are running. If not, `docker compose up -d`. |
| **403 Forbidden** | Nginx permission or Django CSRF. | Check `CSRF_TRUSTED_ORIGINS` in `.env.local`. |
| **Disk Full** | Docker logs or build cache. | Run `docker system prune -f`. |
| **SSL Errors** | Certificate expired or DNS changed. | Run `sudo certbot renew`. |

---

The **QA Deployment to Cloud Server** process is complete. The *Tester* team can begin running test scenarios! 🚀
