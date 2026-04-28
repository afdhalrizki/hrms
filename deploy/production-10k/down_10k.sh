#!/bin/bash

# --- HRMS Teardown Script (Production-10K) ---
# This script brings down the 10k environment containers.
# -------------------------------------------------------------

set -e

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." &> /dev/null && pwd )"
ENV_FILE="deploy/environments/.env.production_10k"

cd "$PROJECT_ROOT"

echo "🛑 Stopping HRMS Production-10K Environment..."

if [ ! -f "$ENV_FILE" ]; then
    echo "⚠️ Warning: $ENV_FILE not found! Docker compose might complain."
fi

docker compose -f deploy/production-10k/docker-compose.10k.yml --env-file "$ENV_FILE" down

echo "✅ Environment stopped successfully!"
