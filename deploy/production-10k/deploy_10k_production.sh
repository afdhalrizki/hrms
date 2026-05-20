#!/bin/bash

# --- Safe Deployment Script for HRMS (Production 10K Environment) ---
# This script is designed to safely deploy to the Production 10K server.
# Process flow: Ensure stable connection, backup database, pull latest code (git pull),
# build new docker containers, run database migrations, and perform health check (smoke test).

set -e # Automatically stop the script if any command fails (returns non-zero exit code)
set -o pipefail # Stop the script if any command in a pipeline (|) fails

# ==========================================
# Directory and Environment Configuration
# ==========================================
# Get the directory where this script is located, then go up 2 levels to the project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." &> /dev/null && pwd )"
ENV_FILE="deploy/environments/.env.production_10k"
COMPOSE_FILE="deploy/production-10k/docker-compose.10k.yml"

# ==========================================
# Phase 0: SSH Connection Stability
# ==========================================
# Prevents terminal disconnects (freezes/timeouts) during long deployment processes.
echo "🛡️ Phase 0: Ensuring Terminal Stability (SSH KeepAlive)..."
if [ -f /etc/ssh/sshd_config ] && grep -q "ClientAliveInterval 0" /etc/ssh/sshd_config; then
    echo "🔧 Optimizing SSH settings to prevent terminal disconnection..."
    # Send "alive" packets every 60 seconds to keep the connection active
    sudo sed -i 's/ClientAliveInterval 0/ClientAliveInterval 60/' /etc/ssh/sshd_config
    sudo sed -i 's/#ClientAliveCountMax 3/ClientAliveCountMax 3/' /etc/ssh/sshd_config
    sudo systemctl restart ssh
    echo "✅ SSH optimized. Terminal is now more stable."
else
    echo "✅ SSH stability already configured."
fi

# Change directory to the project root
cd "$PROJECT_ROOT"

echo "🚀 Starting Safe Deployment Process for HRMS Production 10K..."

# ==========================================
# Phase 1: Database Backup
# ==========================================
# Crucial! Ensures we have a recovery point if the deployment fails or corrupts data.
echo "📦 Phase 1: Creating database backup..."
if ! "$SCRIPT_DIR/backup_10k.sh"; then
    echo "❌ Backup failed! Aborting deployment process for safety."
    exit 1
fi

# ==========================================
# Phase 2: Code Update (Git Pull)
# ==========================================
# Pulls the latest code updates from the git repository.
# Check if the current directory is a valid git repository.
if [ -d ".git" ]; then
    echo "⬇️ Phase 2: Pulling latest code from repository (git pull)..."
    git pull || echo "⚠️ Phase 2: Git pull failed (possibly local changes). Proceeding anyway..."
else
    echo "⚠️ Phase 2: Not a git repository, skipping git pull."
fi

# ==========================================
# Phase 2.5: Pre-Pull Base Images (Fallback & Retries)
# ==========================================
echo "📥 Phase 2.5: Pre-pulling base images to prevent timeouts..."

# Helper function to pull docker image with retries and ECR Public mirror fallback
pre_pull_image() {
    local target_image="$1"
    local fallback_image="$2"
    local max_attempts=3
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        echo "Attempting to pull $target_image from Docker Hub (Attempt $attempt/$max_attempts)..."
        if docker pull "$target_image"; then
            echo "✅ Successfully pulled $target_image."
            return 0
        fi
        echo "⚠️ Attempt $attempt failed."
        attempt=$((attempt + 1))
        sleep 2
    done

    if [ -n "$fallback_image" ]; then
        echo "🔄 Attempting to pull from ECR Public Mirror: $fallback_image..."
        if docker pull "$fallback_image"; then
            echo "🏷️ Successfully pulled from mirror. Retagging to $target_image..."
            docker tag "$fallback_image" "$target_image"
            echo "✅ Retag completed."
            return 0
        fi
    fi

    echo "⚠️ Failed to pull $target_image after several attempts. Docker Compose build will attempt to pull it independently."
    return 0 # Return 0 so it doesn't halt the main script (set -e)
}

# Pre-pull required images so the build/up process doesn't fail midway
pre_pull_image "node:22-bookworm-slim" "public.ecr.aws/docker/library/node:22-bookworm-slim"
pre_pull_image "python:3.10-slim" "public.ecr.aws/docker/library/python:3.10-slim"
pre_pull_image "postgres:15-alpine" "public.ecr.aws/docker/library/postgres:15-alpine"
pre_pull_image "redis:7-alpine" "public.ecr.aws/docker/library/redis:7-alpine"
pre_pull_image "nginx:alpine" "public.ecr.aws/docker/library/nginx:alpine"
pre_pull_image "edoburu/pgbouncer:latest" ""

# ==========================================
# Phase 3: Rebuilding & Running Containers (Deployment)
# ==========================================
echo "🏗️ Phase 3: Rebuilding and running containers..."
# Stop and remove old containers to clear IP and Docker DNS cache.
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down --remove-orphans

# Rerun containers in the background ('-d') and force rebuilding images ('--build')
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build

# ==========================================
# Phase 4: Database Migration
# ==========================================
echo "⚙️ Phase 4: Running database migrations (Public & Tenant Schemas)..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend python manage.py migrate_schemas

# ==========================================
# Phase 4.1: Tenant Initialization
# ==========================================
echo "🏗️ Phase 4.1: Initializing Public Tenant and Domain..."
DOMAIN_SUFFIX=$(grep "^TENANT_DOMAIN_SUFFIX=" "$ENV_FILE" | cut -d'=' -f2 | tr -d '\r')
DOMAIN_SUFFIX=${DOMAIN_SUFFIX:-harikerja.com}

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend python -c "
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from tenants.models import Tenant, Domain
public_tenant, created = Tenant.objects.get_or_create(schema_name='public', defaults={'name': 'HRMS Public Console'})
domain_name = '$DOMAIN_SUFFIX'
Domain.objects.get_or_create(domain=domain_name, defaults={'tenant': public_tenant, 'is_primary': True})
Domain.objects.get_or_create(domain='localhost', defaults={'tenant': public_tenant, 'is_primary': False})
print('✅ Public tenant and domains initialized successfully.')
"

# ==========================================
# Phase 6: Smoke Test (System Health Check)
# ==========================================
echo "🔍 Phase 6: Running Smoke Test (Checking API Status)..."
echo "Waiting 15 seconds for all services to become ready and stable..."
sleep 15

# Determine check port from environments
API_PORT=$(grep "^NEXT_PUBLIC_API_PORT=" "$ENV_FILE" | cut -d'=' -f2 | tr -d '\r')
API_PORT=${API_PORT:-80}

API_STATUS=$(curl -sk -o /dev/null -w "%{http_code}" \
  -H "Host: $DOMAIN_SUFFIX" \
  -H "X-Forwarded-Proto: https" \
  http://localhost:${API_PORT}/api/health/ || echo "000")

if [ "$API_STATUS" -eq 200 ]; then
    echo "✅ Smoke Test Succeeded! API responded successfully (HTTP $API_STATUS)."
else
    echo "❌ Smoke Test Failed! API did not respond correctly (HTTP $API_STATUS)."
    echo "Showing the last 100 lines of backend logs for analysis:"
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs --tail=100 backend | grep -v "health"
    exit 1
fi

# ==========================================
# Phase 7: Cleanup
# ==========================================
echo "🧹 Phase 7: Cleaning up unused Docker artifacts..."
docker image prune -f

# ==========================================
# Completed
# ==========================================
echo "✅ Production 10K Deployment Successfully Completed!"
