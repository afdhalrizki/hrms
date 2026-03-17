# Staging Deployment (IDCloudHost VPS)

This guide outlines the steps to deploy the harikerja HRMS to a Virtual Private Server (VPS) via **IDCloudHost** or similar providers. This setup is perfect for staging environments, internal testing, or early-stage production workloads.

## Architecture Overview
- **Server:** 1x VPS (Minimum 4 vCPU, 8GB RAM).
- **Core OS:** Ubuntu 22.04 LTS.
- **Routing:** Nginx as Reverse Proxy & SSL via Let's Encrypt.
- **Stack:** Docker Compose running Backend, DB, Redis, PgBouncer, and Frontend containers.

## Step 1: Server Preparation
1. SSH into your VPS.
2. Install Docker and Docker Compose.
   ```bash
   sudo apt update
   sudo apt install docker.io docker-compose -y
   sudo systemctl enable --now docker
   ```

## Step 2: Clone & Configure Environments
```bash
git clone <repository-url> /opt/hrms
cd /opt/hrms
```

The system uses environment-specific files located in the `environments/` directory. For staging:
1.  Open `environments/.env.staging`.
2.  Define the following critical variables:
    - `TENANT_DOMAIN_SUFFIX=harikerja.web.id`
    - `SECRET_KEY=your-secure-staging-key`
    - `POSTGRES_PASSWORD=your-secure-db-password`

## Step 3: Frontend Build Configuration
Ensure `environments/.env.staging` has the correct `NEXT_PUBLIC_API_URL` (usually `https://harikerja.web.id/api`).

## Step 4: Deploy Stack
The easiest way to deploy is using the provided tools:

**Windows (PowerShell):**
```powershell
.\up.ps1 staging -build
```

**Linux/VPS (Make/Docker):**
```bash
make staging
```

These commands automatically pull the correct environment variables from `environments/.env.staging`.

## Step 5: Configure Nginx & SSL
Install Nginx and configure reverse proxy routing:
```bash
sudo apt install nginx -y
```

### Nginx Config Example
Map subdomains correctly in Nginx to support Multi-Tenancy (Wildcard SSL is heavily recommended):
```nginx
server {
    listen 80;
    server_name harikerja.web.id *.harikerja.web.id;

    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable the site and install SSL using Certbot:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d harikerja.web.id -d *.harikerja.web.id
```

## Step 6: Initial Database Setup
Apply migrations to the production database:
```bash
docker-compose exec backend python manage.py migrate_schemas --shared
```
You are now live!
