# QA Deployment (IDCloudHost VPS)

This guide outlines the steps to deploy the harikerja HRMS to the **QA environment** via **IDCloudHost** VPS.

## Environment Details
- **Domain:** `harilibur.web.id`
- **Hosting:** IDCloudHost VPS (Minimum 4 vCPU, 8GB RAM).
- **Purpose:** Quality Assurance, UAT, and early-stage functional testing.

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

The system uses environment-specific files located in the `environments/` directory. For QA:
1.  Open `environments/.env.qa` (copy from `.env.staging` if needed).
2.  Define the following critical variables:
    - `TENANT_DOMAIN_SUFFIX=harilibur.web.id`
    - `SECRET_KEY=your-secure-qa-key`
    - `POSTGRES_PASSWORD=your-secure-db-password`

## Step 3: Frontend Build Configuration
Ensure `environments/.env.qa` has the correct `NEXT_PUBLIC_API_URL` (usually `https://harilibur.web.id/api`).

## Step 4: Deploy Stack
**Linux/VPS (Make/Docker):**
```bash
make qa
```

## Step 5: Configure Nginx & SSL (harilibur.web.id)
Map subdomains correctly in Nginx to support Multi-Tenancy:
```nginx
server {
    listen 80;
    server_name harilibur.web.id *.harilibur.web.id;

    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable SSL using Certbot:
```bash
sudo certbot --nginx -d harilibur.web.id -d *.harilibur.web.id
```
