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
echo -e "${GREEN}[Stage 2] Installing Docker...${NC}"

    # Docker Installation (Official Guide - Ubuntu 24.04 compatible)
    apt-get update
    apt-get install -y ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
    echo -e "${GREEN}Docker is already installed.${NC}"
fi

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

docker compose -f deploy/qa/docker-compose.qa.yml --env-file $ENV_FILE up -d --build --remove-orphans

echo -e "${GREEN}Waiting for containers to be healthy (30s)...${NC}"
sleep 30

# Run Migrations
echo -e "${GREEN}Running Migrations (Shared & Tenants)...${NC}"
docker compose -f deploy/qa/docker-compose.qa.yml --env-file $ENV_FILE exec -T backend python manage.py migrate_schemas

# Create Public Tenant (Schema)
echo -e "${GREEN}Creating Public Tenant...${NC}"
# Note: This might fail if tenant already exists, so we use || true
docker compose -f deploy/qa/docker-compose.qa.yml --env-file $ENV_FILE exec -T backend python manage.py create_tenant --schema_name=public --name="harikerja QA Master" --domain-domain=$DOMAIN --is_primary=True || echo "Tenant/Domain might already exist, skipping..."

echo -e "${GREEN}--- Deployment Finished! ---${NC}"
echo "Application should be accessible at: http://$DOMAIN (if port 80/443 is open)"
