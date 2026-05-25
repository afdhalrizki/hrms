# QA Deployment Guide - Cloud Providers

This document contains a step-by-step (End-to-End) guide to deploy the HariKerja HRMS application to the *QA Environment*. We provide recommendations for three major providers: **Biznet GIO**, **IDCloudHost**, and **Hostinger**.

## Server Specifications & Environment Purpose

The **QA Environment** serves as the primary gateway for functional verification. While a future **Staging Environment** will be used for final load testing and maximum user capacity verification (currently omitted), the QA server is dedicated to **Manual User Acceptance Testing (UAT)** and functional stakeholder verification.

| Tier | vCPU | RAM | Storage | Primary Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Current (Active)** | 8 Cores | 8 GB | 60 GB SSD | **Temporary Over-provisioned** (NEO Lite MM 8.8) |
| **Target Ideal** | 2 Cores | 4 GB | 60 GB SSD | **Optimized & Cost-Efficient for Manual UAT** |

> [!IMPORTANT]
> **Current Infrastructure Status:** We are currently utilizing the **Biznet GIO NEO Lite MM 8.8** (8 Core vCPU, 8 GB RAM). While providing excellent compute power, it is **highly overkill** for an internal QA environment. As a reference, the Production-1K environment only uses 4 Cores / 8 GB RAM to handle 1,000 active users. Therefore, we plan to **downgrade to 2 Cores and 4 GB RAM** (NEO Lite MS 4.2) in the next billing cycle to save over 50-75% in hosting costs, while utilizing a **4 GB Swap File** for stability during Docker builds.

### 🧪 QA Environment Usage & Feature Verification
To ensure all features work correctly before hitting production, the QA environment is used for:

1.  **Manual User Acceptance Testing (UAT):** Real users and stakeholders verify business workflows (Payroll, Attendance, Employee Onboarding).
2.  **Multi-tenant Isolation Check:** Ensuring that data between different company schemas remains strictly isolated in a cloud-like environment.
3.  **Sanity & Smoke Testing:** A final manual walkthrough of "Happy Path" scenarios after every deployment.
4.  **Mobile App Integration:** Final testing of the Flutter mobile app against a public HTTPS API endpoint.
5.  **Environment Parity Check:** Verifying that configurations (Env Vars, Nginx, SSL) are consistent with the Production-1K setup.

### Provider Plan Recommendations:
- **Biznet GIO:** Use **NEO Lite MS 4.2** (2 Core, 4 GB RAM) - Optimized Target, or **NEO Lite MM 8.8** (Current).
- **IDCloudHost:** Use **NVMe 3** (2 Cores, 4 GB RAM) for cost-efficient manual testing.
- **Hostinger:** Use **KVM 2** (2 Cores, 4 GB RAM) for stable manual testing performance.

### Technical Rationale for 4GB RAM + 4GB Swap:
Even without automated testing, we maintain **4GB RAM + 4GB Swap** as the ideal target to support:
1.  **PostgreSQL & Redis Cache:** Cost-effective database operations sized properly for a small team of internal testers.
2.  **Docker Build Efficiency:** Utilizing the 4GB Swap file to provide the necessary virtual memory headroom during Next.js production builds (`npm run build`), preventing Out-Of-Memory (OOM) crashes.
3.  **Concurrency Support:** Allowing up to 5-10 stakeholders to perform manual UAT concurrently without any bottleneck.
4.  **Local Storage Parity:** Storing files locally in a Docker volume without the complexity and cost of Biznet NEO Object Storage.

**General Requirements:**
- **Recommended OS:** Ubuntu 22.04 LTS / 24.04 LTS
- **QA Domain:** `harikerja.web.id`
- **DNS Setup:** Using **NEO DNS Manager** in the Biznet GIO dashboard.

---

## Stage 0: DNS Configuration (Biznet GIO Dashboard)

Before starting on the server, connect your domain to the Biznet VPS IP:

1.  Get the **Public IP** from the `Compute > harikerja-qa` panel.
2.  Go to the **Network > NEO DNS** menu.
3.  Select the `harikerja.web.id` domain.
4.  Add a new **A Record**:
    *   **Host/Name:** `@` (or leave blank)
    *   **IP Address:** `[Your VPS IP]`
5.  Add a **Wildcard A Record**:
    *   **Host/Name:** `*`
    *   **IP Address:** `[Your VPS IP]` (Same as above)
    *   *Purpose: So tenant subdomains like `company1.harikerja.web.id` connect automatically.*

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

### 2. Setup Swap Memory (Mandatory for 4GB RAM Tiers)
Since the optimized target uses 4GB physical RAM, adding a 4GB Swap is **mandatory** to ensure Docker builds do not experience Out-of-Memory (OOM) errors during Next.js builds (a best practice for Docker Servers):

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
Use the official Docker repository to get the latest and most stable version:

```bash
# 1. Update package list & Install initial dependencies
sudo apt update && sudo apt install -y ca-certificates curl gnupg

# 2. Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# 3. Add Docker repository to Apt sources
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 4. Install Docker Engine & Compose Plugin
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 5. Manage Docker as a non-root user
# So you don't have to type 'sudo' every time you run a docker command
sudo usermod -aG docker $USER

# IMPORTANT: You must LOG OUT and LOG IN again to SSH for this group change to take effect.
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
We have provided a script `deploy/qa/deploy_qa.sh` which handles the entire update process safely in one command.

**What happens during the automated deployment:**
- **Stage 0 (SSH Stability):** Modifies the SSH configuration to prevent terminal freezing or dropping connections during the process.
- **Stage 1 (Backup):** Creates a database backup before any code changes are made. The deployment is aborted if the backup fails.
- **Stage 2 (Code Update):** Pulls the latest source code from the Git repository.
- **Stage 3 (Deployment):** Tears down the old containers and networks, then rebuilds and starts the new containers using the latest code.
- **Stage 4 (Migrations):** Executes database schema migrations for both the public schema and all existing tenant schemas. Runs initialization scripts for QA tenants.
- **Stage 5 (Unit Testing):** *(Currently disabled)* Executes `pytest` to automatically verify functionality.
- **Stage 6 (Smoke Test):** Waits for services to start, then queries the API health endpoint to ensure the application is successfully responding.
- **Stage 7 (Cleanup):** Prunes unused Docker images to free up disk space.

**Usage:**
```bash
./deploy/qa/deploy_qa.sh
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

### 3. Run Django-Tenants Migrations (If Setup Fails)
If you need to manually run migrations on the *Public Schema* (Main tenant):

```bash
docker compose exec backend bash
python manage.py migrate_schemas --shared
python manage.py create_tenant --schema_name=public --name="HariKerja QA Master" --domain-domain=harikerja.web.id --is_primary=True
```

---

## Stage 5: Nginx Configuration (Containerized)

**IMPORTANT:** Since the latest standardization, we use **Nginx inside Docker** (integrated in `docker-compose.qa.yml`) for maximum isolation. You do not need to install Nginx on the host server unless you want to use it as an additional *Load Balancer*.

If you still want to use Nginx on the host (Legacy Mode), use the following configuration:
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
For a *Multi-Tenant* (SaaS) application, we must use *Wildcard SSL* (`*.harikerja.web.id`).

```bash
sudo certbot certonly --manual --preferred-challenges=dns --email admin@harikerja.web.id --server https://acme-v02.api.letsencrypt.org/directory --agree-tos -d harikerja.web.id -d *.harikerja.web.id
```

> **IMPORTANT (Biznet DNS Step)**:
> Certbot will provide a *TXT record* code (e.g., `_acme-challenge.harikerja.web.id`). 
> 1. Copy that code.
> 2. Go to **NEO DNS Manager** in Biznet GIO.
> 3. Add a new record: Type **TXT**, Name `_acme-challenge`, Value `[Code from Certbot]`.
> 4. Wait 1-2 minutes, then press `Enter` in the terminal.

Once the certificate is successfully created, Nginx inside Docker will automatically read it if the certificate files are mounted into the container (check `docker-compose.qa.yml`).

---

## Stage 6: Verification & UAT (*User Acceptance Testing*)

If all steps are successful, validate from your Browser:
1. Access `https://harikerja.web.id` -> It should display the Next.js *Landing Page / Admin Panel Login*.
2. Access `https://harikerja.web.id/api/schema/swagger-ui/` -> It should display the Django API documentation without SSL errors.

---

## Stage 7: Maintenance & Automated Backups

Since you are managing this alone, keeping the data safe is a priority. We have provided a backup script to automate this.

### 1. Database Backup Script
We use the `deploy/qa/backup_qa.sh` script. This script has a **First-Deploy Safety** feature:
- Checks if the database is running.
- If the container does not exist (during the first setup), the script skips the backup without errors so the deployment can continue.
- If the container is active, a `.sql.gz` file is created in the `backups/` folder.
- Automatically deletes backups older than 7 days.

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
