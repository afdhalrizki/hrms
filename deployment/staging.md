# Staging Deployment (Single Node / VPS)

This guide outlines the steps to deploy harikerja HRMS to a Virtual Private Server (VPS) via providers like DigitalOcean, Linode, or IDCloudHost. This setup is perfect for staging environments or small production deployments (<5,000 users).

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

Create production configuration files based on the templates in `environments/`:
- Edit `.env.staging` to define:
  - `TENANT_DOMAIN_SUFFIX=yourdomain.com`
  - Secure `POSTGRES_PASSWORD` and `DJANGO_SECRET_KEY`

## Step 3: Frontend Build Configuration
Update the `frontend/Dockerfile` to ensure it builds a production-ready Next.js image, pointing to the external domain (e.g., `NEXT_PUBLIC_API_URL=https://api.yourdomain.com`).

## Step 4: Deploy Stack
```bash
docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d --build
```

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
    server_name yourdomain.com *.yourdomain.com;

    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }
}
```

Enable the site and install SSL using Certbot:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d *.yourdomain.com
```

## Step 6: Initial Database Setup
Apply migrations to the production database:
```bash
docker-compose exec backend python manage.py migrate_schemas --shared
```
You are now live!
