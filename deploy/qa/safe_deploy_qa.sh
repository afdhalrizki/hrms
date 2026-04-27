#!/bin/bash

# --- HRMS Safe Deploy Script (QA) ---
# This script ensures a backup is created BEFORE deploying new changes.
# It pulls the latest code, backups the DB, builds, and runs migrations.

set -e
set -o pipefail

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." &> /dev/null && pwd )"
ENV_FILE="deploy/environments/.env.qa"

cd "$PROJECT_ROOT"

echo "🚀 Starting Safe Deployment for HRMS QA..."

# 1. Backup Phase
echo "📦 Step 1: Creating database backup..."
if ! "$SCRIPT_DIR/backup_qa.sh"; then
    echo "❌ Backup failed! Aborting deployment for safety."
    exit 1
fi

# 2. Update Phase (Optional: Git Pull)
# We check if we are in a git repo before pulling
if [ -d ".git" ]; then
    echo "⬇️ Step 2: Pulling latest code from repository..."
    git pull
else
    echo "⚠️ Step 2: Not a git repository, skipping git pull."
fi

# 3. Deployment Phase (Build & Up)
echo "🏗️ Step 3: Rebuilding and starting containers..."
# Using up.mjs for consistency, which handles env files and docker-compose detection
node up.mjs qa build

# 4. Migration Phase
echo "⚙️ Step 4: Running database migrations..."
docker compose --env-file "$ENV_FILE" exec -T backend python manage.py migrate_schemas --shared

# 5. Unit Testing Phase
echo "🧪 Step 5: Running Backend Unit Tests..."
if ! docker compose --env-file "$ENV_FILE" exec -T backend pytest -m "not e2e" -n auto; then
    echo "❌ Unit Tests Failed! Deployment might be unstable."
    echo "Check test output above."
    # We don't necessarily want to kill the server if tests fail in QA, 
    # but we should definitely notify the user.
    # For now, we continue but with a warning, or exit if you want strictness.
    # User said "iya boleh" to adding it, so let's be strict for QA.
    exit 1
fi
echo "✅ Unit Tests Passed!"

# 6. Smoke Test Phase
echo "🔍 Step 6: Running Smoke Test (Health Check)..."
echo "Waiting for services to settle (10s)..."
sleep 10

# Check API Health
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/ || echo "000")

if [ "$API_STATUS" -eq 200 ] || [ "$API_STATUS" -eq 301 ] || [ "$API_STATUS" -eq 302 ]; then
    echo "✅ Smoke Test Passed! API is responding (HTTP $API_STATUS)."
else
    echo "❌ Smoke Test Failed! API is not responding correctly (HTTP $API_STATUS)."
    echo "Check logs using: docker compose --env-file $ENV_FILE logs backend"
    exit 1
fi

echo "✅ Safe Deployment Finished Successfully!"
echo "Your app is now up to date and a backup has been saved in the 'backups/' folder."
