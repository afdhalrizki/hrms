# QA Deployment Guide - Cloud Providers

This document contains a step-by-step (End-to-End) guide to deploy the harikerja HRMS application to the *QA Environment*. We provide recommendations for three major providers: **Biznet GIO**, **IDCloudHost**, and **Hostinger**.

## Recommended Server Specifications

Based on the UAT/QA workload analysis, the following are the required server specifications for each provider:

| Provider | Recommended Plan | vCPU | RAM | Storage | Performance Tier |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Biznet GIO** | NEO Lite MM 8.4 | 4 | 8 GB | 60 GB SSD | Dedicated CPU (Robust) |
| **IDCloudHost** | NVMe 5 | 4 | 8 GB | 140 GB NVMe | Extreme NVMe (Fast I/O) |
| **Hostinger** | KVM 2 | 2 | 8 GB | 100 GB NVMe | Cost-Efficient (Reliable) |

### Provider Specific Notes:
- **Biznet GIO:** Use the **NEO Lite** series. It offers consistent performance for CPU-intensive Docker build processes.
- **IDCloudHost:** Use the **Cloud VPS NVMe** series for the best database response times.
- **Hostinger:** Use the **KVM VPS** series. You can choose the **Ubuntu 24.04** template for the latest security patches.

**General Requirements:**
- **Recommended OS:** Ubuntu 22.04 LTS / 24.04 LTS
- **QA Domain:** `qa.harikerja.com`

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
ALLOWED_HOSTS=.qa.harikerja.com,localhost,127.0.0.1
CSRF_TRUSTED_ORIGINS=https://*.qa.harikerja.com

# --- TENANT SETTINGS ---
TENANT_DOMAIN_SUFFIX=qa.harikerja.com

# --- DATABASE ---
POSTGRES_DB=hrms_qa
POSTGRES_USER=hrms_qa_user
POSTGRES_PASSWORD=very_secret_db_password
POSTGRES_HOST=db
POSTGRES_PORT=5432

# --- FRONTEND ---
NEXT_PUBLIC_API_URL=https://qa.harikerja.com/api
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
python manage.py create_tenant --schema_name=public --name="harikerja QA Master" --domain-domain=qa.harikerja.com --is_primary=True
```

---

## Stage 5: Nginx Reverse Proxy & SSL Configuration (HTTPS)

Our application needs to be accessible via `https://qa.harikerja.com` and *wildcard tenants* like `https://<anything>.qa.harikerja.com`.

### 1. Create Nginx Server Block
Create a specific configuration file:
```bash
sudo nano /etc/nginx/sites-available/hrms_qa
```

Insert the following *Reverse Proxy* code:
```nginx
server {
    listen 80;
    server_name qa.harikerja.com *.qa.harikerja.com;

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
Specifically for *Multi-Tenant* (SaaS) applications, we **must** use a *Wildcard SSL* (`*.qa.harikerja.com`). This requires DNS validation.

```bash
sudo certbot certonly --manual --preferred-challenges=dns --email admin@qa.harikerja.com --server https://acme-v02.api.letsencrypt.org/directory --agree-tos -d qa.harikerja.com -d *.qa.harikerja.com
```

> **IMPORTANT**:
> The command above will provide a *TXT record* (e.g., `_acme-challenge.qa.harikerja.com`). You must go to your domain's **DNS Manager Panel**, and add the TXT record before pressing `Enter` in the terminal.

After the certificate is issued, edit the manual Nginx profile to install the SSL:
```bash
sudo nano /etc/nginx/sites-available/hrms_qa
```
Change the `listen 80;` port to the standard `443 ssl` (refer to the standard Certbot Nginx guide).

---

## Stage 6: Verification & UAT (*User Acceptance Testing*)

If all steps are successful, validate from your Browser:
1. Access `https://qa.harikerja.com` -> It should display the Next.js *Landing Page / Admin Panel Login*.
2. Access `https://qa.harikerja.com/api/schema/swagger-ui/` -> It should display the Django API documentation without SSL errors.
3. Create a new tenant in the system, then access `https://<tenantname>.qa.harikerja.com` to ensure the cross-company access protection runs without a 404 (Not Found) in the Next.js *routing*.

The **QA Deployment to Cloud Server** process is complete. The *Tester* team can begin running test scenarios! 🚀
