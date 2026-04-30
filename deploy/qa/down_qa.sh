#!/bin/bash

# --- HRMS Teardown Script (QA) ---
# This script brings down the QA environment containers.
# -------------------------------------------------------------

set -e

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." &> /dev/null && pwd )"
ENV_FILE="deploy/environments/.env.qa"

cd "$PROJECT_ROOT"

echo "🛑 Stopping HRMS QA Environment..."

if [ ! -f "$ENV_FILE" ]; then
    echo "⚠️ Warning: $ENV_FILE not found! Docker compose might complain."
fi

docker compose -f deploy/qa/docker-compose.qa.yml --env-file "$ENV_FILE" down

echo "✅ Environment stopped successfully!"
