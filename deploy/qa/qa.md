# QA Deployment Guide - Cloud Providers

This document contains a step-by-step (End-to-End) guide to deploy the harikerja HRMS application to the *QA Environment*. We provide recommendations for three major providers: **Biznet GIO**, **IDCloudHost**, and **Hostinger**.

## Recommended Server Specifications

Based on the UAT/QA workload analysis, specifically considering **Automated E2E Testing (Playwright)** requirements, the following are the required server specifications:

| Tier | vCPU | RAM | Storage | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Minimum** | 4 Cores | 8 GB | 60 GB SSD | Manual UAT & Basic API Testing |
| **Ideal (Lancar)** | 8 Cores | 16 GB | 100 GB NVMe | Full Automated E2E & CI/CD Pipelines |

### Provider Plan Recommendations:
- **Biznet GIO:** Use **NEO Lite MM 8.4** (Min) or **NEO Lite MM 16.8** (Ideal).
- **IDCloudHost:** Use **NVMe 5** (Min) or **NVMe 6** (Ideal) for better I/O performance.
- **Hostinger:** Use **KVM 4** or above to ensure enough RAM for headless browsers.

### Technical Rationale for 16GB RAM:
While the Django backend and Next.js frontend are lightweight, the **QA Environment** has unique resource demands:
1.  **Headless Browsers (Playwright/Cypress):** Each worker instance of a headless browser (Chrome/Webkit) can consume **500MB - 1GB RAM**. Running 4+ tests in parallel requires significant RAM headroom.
2.  **CI/CD Overhead:** If the server is used as a GitHub Action runner or for local Docker builds, the Next.js compilation process is very CPU/RAM intensive.
3.  **Database Seeding:** Frequent resets and seeding of the multi-tenant database snapshots are significantly faster with a larger PostgreSQL shared buffer.

**General Requirements:**
- **Recommended OS:** Ubuntu 22.04 LTS / 24.04 LTS
- **QA Domain:** `harikerja.web.id`

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

### 1. Install Docker & Docker Compose Plugin
```bash
# Remove old docker installations (if any)
sudo apt-get remove docker docker-engine docker.io containerd runc

# Install docker repository certificates
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add docker repository
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Grant docker access without "sudo" for the active user (if not root)
# sudo usermod -aG docker $USER
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
```

---

## Stage 4: Build and Deploy Process

We will use the primary `docker-compose.yml` because the recommended specifications (8GB RAM) are highly capable of handling the resource isolation limits feature.

### 1. Run Built-in Commands (*Makefile* / Script)
If using the project's built-in *Makefile*:
```bash
make qa
```
*(Or you can run it manually via Docker Compose:)*
```bash
docker compose -f docker-compose.yml up -d --build
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

## Stage 5: Nginx Reverse Proxy & SSL Configuration (HTTPS)

Our application needs to be accessible via `https://qa.harikerja.web.id` and *wildcard tenants* like `https://<anything>.qa.harikerja.web.id`.

### 1. Create Nginx Server Block
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
Specifically for *Multi-Tenant* (SaaS) applications, we **must** use a *Wildcard SSL* (`*.harikerja.web.id`). This requires DNS validation.

```bash
sudo certbot certonly --manual --preferred-challenges=dns --email admin@harikerja.web.id --server https://acme-v02.api.letsencrypt.org/directory --agree-tos -d harikerja.web.id -d *.harikerja.web.id
```

> **IMPORTANT**:
> The command above will provide a *TXT record* (e.g., `_acme-challenge.harikerja.web.id`). You must go to your domain's **DNS Manager Panel**, and add the TXT record before pressing `Enter` in the terminal.

After the certificate is issued, edit the manual Nginx profile to install the SSL:
```bash
sudo nano /etc/nginx/sites-available/hrms_qa
```
Change the `listen 80;` port to the standard `443 ssl` (refer to the standard Certbot Nginx guide).

---

## Stage 6: Verification & UAT (*User Acceptance Testing*)

If all steps are successful, validate from your Browser:
1. Access `https://harikerja.web.id` -> It should display the Next.js *Landing Page / Admin Panel Login*.
2. Access `https://harikerja.web.id/api/schema/swagger-ui/` -> It should display the Django API documentation tanpa SSL errors.

---

## Stage 7: Maintenance & Solo-Dev "Health Checks"

Since you are managing this alone, use these commands to keep the server healthy:

### 1. Simple Database Backup
Run this once a week or before big updates:
```bash
docker exec hrms-db-1 pg_dump -U hrms_qa_user hrms_qa > qa_backup_$(date +%F).sql
```

### 2. Cleaning Disk Space (Docker)
Docker can eat up your SSD quickly. Run this monthly:
```bash
# Remove unused images, containers, and networks
docker system prune -a --volumes -f

# Check which folders are heavy
du -sh /var/lib/docker
```

### 3. Checking Resource Usage
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
