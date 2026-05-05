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

# 0. SSH Stability Phase
echo "🛡️ Step 0: Ensuring Terminal Stability (SSH KeepAlive)..."
if grep -q "ClientAliveInterval 0" /etc/ssh/sshd_config; then
    echo "🔧 Optimizing SSH settings to prevent terminal freeze..."
    sudo sed -i 's/ClientAliveInterval 0/ClientAliveInterval 60/' /etc/ssh/sshd_config
    sudo sed -i 's/#ClientAliveCountMax 3/ClientAliveCountMax 3/' /etc/ssh/sshd_config
    sudo systemctl restart ssh
    echo "✅ SSH optimized. Terminal should no longer freeze."
else
    echo "✅ SSH stability already configured."
fi

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
    git pull || echo "⚠️ Step 2: Git pull failed, maybe local changes exist. Proceeding anyway..."
else
    echo "⚠️ Step 2: Not a git repository, skipping git pull."
fi

# 3. Deployment Phase (Build & Up)
echo "🏗️ Step 3: Rebuilding and starting containers..."
# Use down first to clear old container IPs and Docker DNS cache
docker compose -f deploy/qa/docker-compose.qa.yml --env-file "$ENV_FILE" down --remove-orphans
docker compose -f deploy/qa/docker-compose.qa.yml --env-file "$ENV_FILE" up -d --build

# 4. Migration Phase
echo "⚙️ Step 4: Running database migrations (Shared & Tenants)..."
docker compose -f deploy/qa/docker-compose.qa.yml --env-file "$ENV_FILE" exec -T backend python manage.py migrate_schemas

# 4.1. Tenant Setup Phase
echo "🏗️ Step 4.1: Initializing Public Tenant and Domains..."
docker compose -f deploy/qa/docker-compose.qa.yml --env-file "$ENV_FILE" exec -T backend python scripts/setup_qa_tenant.py

# 5. Unit Testing Phase
# echo "🧪 Step 5: Running Backend Unit Tests..."
# if ! docker compose -f deploy/qa/docker-compose.qa.yml --env-file "$ENV_FILE" exec -T backend pytest -m "not e2e" -n auto; then
#     echo "❌ Unit Tests Failed! Deployment might be unstable."
#     echo "Check test output above."
#     exit 1
# fi
# echo "✅ Unit Tests Passed!"

# 6. Smoke Test Phase
echo "🔍 Step 6: Running Smoke Test (Health Check)..."
echo "Waiting for services to settle (15s)..."
sleep 15

# Check API Health following redirects (-L) and allowing insecure certs (-k)
# We expect 200 OK after following the HTTPS redirect
# Note: We use -s to suppress progress bar to keep terminal clean
API_STATUS=$(curl -skL -o /dev/null -w "%{http_code}" -H "Host: harikerja.web.id" http://localhost:80/api/health/ || echo "000")

if [ "$API_STATUS" -eq 200 ]; then
    echo "✅ Smoke Test Passed! API is responding (HTTP $API_STATUS)."
else
    echo "❌ Smoke Test Failed! API is not responding correctly (HTTP $API_STATUS)."
    echo "Dumping backend logs for diagnosis:"
    docker compose -f deploy/qa/docker-compose.qa.yml --env-file "$ENV_FILE" logs --tail=100 backend | grep -v "health"
    exit 1
fi

# 7. Cleanup
echo "🧹 Step 7: Cleaning up unused Docker artifacts..."
docker image prune -f

echo "✅ Safe Deployment Finished Successfully!"
echo "Your app is now up to date and a backup has been saved in the 'backups/' folder."
