#!/bin/bash

# --- HRMS QA Deployment Script ---
# This script automates the manual steps in deployment/qa.md
# Designed for Ubuntu 22.04 / 24.04

set -e # Exit on error

# --- Configuration & Paths ---
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." &> /dev/null && pwd )"

DOMAIN="harikerja.web.id"
PROJECT_DIR="/opt/hrms"
SWAP_SIZE="4G"
EMAIL="admin@$DOMAIN"

# Text Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${GREEN}--- Starting HRMS QA Deployment ---${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}Please run as root or with sudo${NC}"
  exit 1
fi

# Detect Ubuntu
if ! grep -qi "ubuntu" /etc/os-release; then
  echo -e "${RED}This script is intended for Ubuntu.${NC}"
  exit 1
fi

# --- Stage 1: Initial Server Provisioning ---
echo -e "${GREEN}[Stage 1] Updating OS & Basic Utilities...${NC}"
apt update && apt upgrade -y
apt install -y curl wget git vim htop ufw

# Setup Swap
if [ ! -f /swapfile ]; then
    echo -e "${GREEN}Creating ${SWAP_SIZE} swap file...${NC}"
    fallocate -l $SWAP_SIZE /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
else
    echo -e "${GREEN}Swap file already exists.${NC}"
fi

# Firewall Configuration
echo -e "${GREEN}Configuring Firewall (UFW)...${NC}"
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
echo "y" | ufw enable

# --- Stage 2: Core Infrastructure ---
echo -e "${GREEN}[Stage 2] Installing Docker & Nginx...${NC}"

# Docker Installation (Official Guide)
if ! command -v docker &> /dev/null; then
    apt-get remove -y docker docker-engine docker.io containerd runc || true
    apt-get install -y ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
    "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
    echo -e "${GREEN}Docker is already installed.${NC}"
fi

# Nginx & Certbot
apt install -y nginx certbot python3-certbot-nginx

# --- Stage 3: Repository & Configuration ---
echo -e "${GREEN}[Stage 3] Preparing Application...${NC}"

# Create project dir if not exists
mkdir -p $PROJECT_DIR

# If already in a git repo, assume we use current files
if [ -d "$PROJECT_ROOT/.git" ]; then
    echo -e "${GREEN}Detected HRMS repository at $PROJECT_ROOT${NC}"
    cd "$PROJECT_ROOT"
else
    echo -e "${RED}Error: Cannot find .git directory at $PROJECT_ROOT. Please ensure you are in the correct repository.${NC}"
    exit 1
fi

# Ensure .env.qa exists
ENV_FILE="deploy/environments/.env.qa"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: $ENV_FILE not found! Please ensure it exists in the repository.${NC}"
    exit 1
fi

# --- Stage 4: Build and Deploy ---
echo -e "${GREEN}[Stage 4] Building and Starting Containers using $ENV_FILE...${NC}"

# Use make qa or docker compose directly
if [ -f Makefile ]; then
    make qa
else
    docker compose --env-file $ENV_FILE up -d --build
fi

echo -e "${GREEN}Waiting for containers to be healthy (30s)...${NC}"
sleep 30

# Run Migrations
echo -e "${GREEN}Running Migrations (Shared & Tenants)...${NC}"
docker compose exec -T backend python manage.py migrate_schemas

# Create Public Tenant (Schema)
echo -e "${GREEN}Creating Public Tenant...${NC}"
# Note: This might fail if tenant already exists, so we use || true
docker compose exec -T backend python manage.py create_tenant --schema_name=public --name="harikerja QA Master" --domain-domain=$DOMAIN --is_primary=True || echo "Tenant/Domain might already exist, skipping..."

# --- Stage 5: Nginx & SSL ---
echo -e "${GREEN}[Stage 5] Configuring Nginx Reverse Proxy...${NC}"

NGINX_CONF="/etc/nginx/sites-available/hrms_qa"

cat > $NGINX_CONF <<EOF
server {
    listen 80;
    server_name $DOMAIN *.$DOMAIN;

    client_max_body_size 100M;

    # Backend API Routing (Django Rest Framework)
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host \$http_host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Backend Admin Panel
    location /admin/ {
        proxy_pass http://127.0.0.1:8000/admin/;
        proxy_set_header Host \$http_host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Static files (for Django Admin CSS/JS)
    location /static/ {
        proxy_pass http://127.0.0.1:8000/static/;
        proxy_set_header Host \$http_host;
    }

    # Media files (for user uploads)
    location /media/ {
        proxy_pass http://127.0.0.1:8000/media/;
        proxy_set_header Host \$http_host;
    }

    # Frontend Routing (Next.js)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$http_host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        add_header X-Frame-Options "SAMEORIGIN";
        add_header X-XSS-Protection "1; mode=block";
        add_header X-Content-Type-Options "nosniff";

        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

# Enable Nginx config
ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default || true
nginx -t
systemctl reload nginx

# SSL SETUP (MANUAL INTERVENTION WARNING)
echo -e "${RED}--- IMPORTANT: WILDCARD SSL SETUP ---${NC}"
echo -e "To handle multi-tenant subdomains, we need a Wildcard SSL."
echo -e "You will need to manually add a TXT record to your DNS settings."
echo -e "Domain: $DOMAIN and *.$DOMAIN"
echo ""
read -p "Proceed to Certbot execution? (y/n): " confirm
if [[ $confirm == [yY] ]]; then
    certbot certonly --manual --preferred-challenges=dns --email $EMAIL --server https://acme-v02.api.letsencrypt.org/directory --agree-tos -d $DOMAIN -d *.$DOMAIN
    
    echo -e "${GREEN}SSL Issued. Please manually update Nginx to listen on 443 ssl.${NC}"
    echo -e "Ref: https://certbot.eff.org/instructions?ws=nginx&os=ubuntufocal"
else
    echo -e "Skipping Certbot. Remember to configure SSL manually."
fi

echo -e "${GREEN}--- Deployment Finished! ---${NC}"
echo "Application should be accessible at: http://$DOMAIN (if port 80/443 is open)"
