#!/bin/bash

# --- HRMS Safe Deploy Script (Staging 1K) ---
# Performance validation deployment script.

set -e
set -o pipefail

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." &> /dev/null && pwd )"
ENV_FILE="deploy/environments/.env.staging_1k"
COMPOSE_FILE="deploy/staging-1k/docker-compose.staging-1k.yml"

cd "$PROJECT_ROOT"

echo "🚀 Starting Staging 1K Deployment (Load Test Mirror)..."

# 1. Validation Phase
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: $ENV_FILE not found. Please create it first."
    exit 1
fi

# 2. Backup Phase
echo "📦 Step 1: Creating safety backup..."
"$SCRIPT_DIR/backup_staging-1k.sh"

# 3. Docker Build & Up
echo "🏗️ Step 2: Rebuilding and starting containers (Staging Mirror)..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build --remove-orphans

# 4. Database Migrations
echo "⚙️ Step 3: Running Django migrations (Multi-Tenant)..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend python manage.py migrate_schemas

# 5. Health Check / Smoke Test
echo "🔍 Step 4: Running Health Checks..."
sleep 10
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health/ || echo "000")

if [ "$API_STATUS" -eq 200 ]; then
    echo "✅ Smoke Test Passed! Staging is online."
else
    echo "❌ Warning: API health check returned HTTP $API_STATUS. Check logs."
fi

# 6. Cleanup
echo "🧹 Step 5: Pruning old Docker images..."
docker image prune -f

echo "✅ Staging 1K Deployment Finished!"
