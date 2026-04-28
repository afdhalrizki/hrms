#!/bin/bash

# --- HRMS Production 10K Deployment Script ---
# Optimized for High-Traffic VPS Environments
# ---------------------------------------------

set -e
set -o pipefail

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." &> /dev/null && pwd )"
ENV_FILE="deploy/environments/.env.production_10k"
BACKUP_SCRIPT="$PROJECT_ROOT/deploy/qa/backup_qa.sh" # Reuse logic but config will differ

cd "$PROJECT_ROOT"

echo "🔥 STARTING PRODUCTION-10K DEPLOYMENT..."

# 1. Pre-Check
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: $ENV_FILE not found! Create it first."
    exit 1
fi

# 2. Safety Backup
echo "📦 Step 1: Performing pre-deployment backup..."
# Menggunakan backup_10k.sh khusus untuk skala produksi
./deploy/production-10k/backup_10k.sh

# 3. Code Update
echo "⬇️ Step 2: Fetching latest stable code..."
git pull origin main

# 4. Build & Optimize
echo "🏗️ Step 3: Rebuilding containers with production optimization..."
docker compose -f deploy/production-10k/docker-compose.10k.yml --env-file "$ENV_FILE" up -d --build --remove-orphans

# 5. Database Migrations
echo "⚙️ Step 4: Running schema migrations (Shared & Tenants)..."
# PENTING: Jangan gunakan --shared saja, agar tabel tenant juga terupdate
docker compose -f deploy/production-10k/docker-compose.10k.yml --env-file "$ENV_FILE" exec -T backend python manage.py migrate_schemas

# 6. Maintenance: Cleanup
echo "🧹 Step 5: Cleaning up unused Docker artifacts..."
docker image prune -f

# 7. Health Check
echo "🔍 Step 6: Verifying service health..."
sleep 10
docker compose -f deploy/production-10k/docker-compose.10k.yml --env-file "$ENV_FILE" ps

echo "🚀 PRODUCTION-10K DEPLOYMENT COMPLETED!"
echo "Check logs if any service is 'unhealthy': docker compose logs -f"
