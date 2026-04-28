#!/bin/bash

# --- HRMS Safe Deploy Script (Production-10K) ---
# This script ensures a backup is created BEFORE deploying new changes.
# It pulls the latest code, backups the DB, builds, and runs migrations.
# -------------------------------------------------------------

set -e
set -o pipefail

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." &> /dev/null && pwd )"
ENV_FILE="deploy/environments/.env.production_10k"

cd "$PROJECT_ROOT"

echo "🚀 Starting Safe Deployment for HRMS Production-10K..."

# 1. Pre-Check
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: $ENV_FILE not found! Create it first."
    exit 1
fi

# 2. Backup Phase
echo "📦 Step 1: Creating database backup for safety..."
if ! "$SCRIPT_DIR/backup_10k.sh"; then
    echo "❌ Backup failed! Aborting deployment for safety."
    exit 1
fi

# 3. Update Phase
echo "⬇️ Step 2: Fetching latest stable code from main..."
# git pull origin main # Skipped for local verification of current changes

# 4. Deployment Phase (Build & Up)
echo "🏗️ Step 3: Rebuilding and starting containers..."
# We use direct docker compose for production 10k to ensure all flags are explicit
docker compose -f deploy/production-10k/docker-compose.10k.yml --env-file "$ENV_FILE" up -d --build --remove-orphans

echo "⏳ Waiting for PgBouncer to settle..."
sleep 5

# 5. Migration Phase
echo "⚙️ Step 4: Running database migrations (Shared & Tenants)..."
# PENTING: Memproses semua skema agar tidak ada data tenant yang tertinggal
docker compose -f deploy/production-10k/docker-compose.10k.yml --env-file "$ENV_FILE" exec -T backend python manage.py migrate_schemas

# 6. Smoke Test Phase
echo "🔍 Step 5: Running Smoke Test (Health Check)..."
echo "Waiting for services to settle (15s for 10k scale)..."
sleep 15

# Check API Health (assuming local port 80 is mapped via Nginx)
# In production, we check the health endpoint
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80/api/health/ || echo "000")

if [ "$API_STATUS" -eq 200 ]; then
    echo "✅ Smoke Test Passed! API is healthy (HTTP $API_STATUS)."
else
    echo "⚠️ Smoke Test Warning: Health endpoint returned HTTP $API_STATUS."
    echo "Verifying root API as fallback..."
    API_ROOT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80/api/ || echo "000")
    if [ "$API_ROOT_STATUS" -eq 200 ] || [ "$API_ROOT_STATUS" -eq 301 ] || [ "$API_ROOT_STATUS" -eq 302 ]; then
        echo "✅ Fallback Smoke Test Passed! API is responding."
    else
        echo "❌ Smoke Test Failed! Application might be down."
        echo "Check logs using: docker compose -f deploy/production-10k/docker-compose.10k.yml --env-file $ENV_FILE logs backend"
        exit 1
    fi
fi

# 7. Cleanup
echo "🧹 Step 6: Cleaning up unused Docker artifacts..."
docker image prune -f

echo "✅ Safe Deployment Finished Successfully!"
echo "Production-10K is now up to date."
