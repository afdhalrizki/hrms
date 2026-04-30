#!/bin/bash

# --- HRMS Safe Deploy Script (Production 1K) ---
# High-reliability deployment script with automatic backups and smoke tests.

set -e
set -o pipefail

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." &> /dev/null && pwd )"
ENV_FILE="deploy/environments/.env.production_1k"
COMPOSE_FILE="deploy/production-1k/docker-compose.1k.yml"

cd "$PROJECT_ROOT"

echo "🚀 Starting High-Performance Deployment for Production 1K (1,000 Users)..."

# 1. Validation Phase
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: $ENV_FILE not found. Please create it first."
    exit 1
fi

# 2. Backup Phase
echo "📦 Step 1: Creating safety backup..."
"$SCRIPT_DIR/backup_1k.sh"

# 3. Code Update
if [ -d ".git" ]; then
    echo "⬇️ Step 2: Updating source code..."
    git pull || echo "⚠️ Git pull failed, proceeding with local code."
fi

# 4. Docker Build & Up
echo "🏗️ Step 3: Rebuilding and starting containers (Production Mode)..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build --remove-orphans

# 5. Database Migrations
echo "⚙️ Step 4: Running Django migrations (Multi-Tenant)..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend python manage.py migrate_schemas

# 6. Health Check / Smoke Test
echo "🔍 Step 5: Running Health Checks..."
sleep 10
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health/ || echo "000")

if [ "$API_STATUS" -eq 200 ]; then
    echo "✅ Smoke Test Passed! System is online."
else
    echo "❌ Warning: API health check returned HTTP $API_STATUS. Check logs."
fi

# 7. Cleanup
echo "🧹 Step 6: Pruning old Docker images..."
docker image prune -f

echo "✅ Production 1K Deployment Finished!"
