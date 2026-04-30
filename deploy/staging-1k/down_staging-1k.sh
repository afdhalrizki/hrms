#!/bin/bash

# --- HRMS Stop Script (Staging 1K) ---

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." &> /dev/null && pwd )"
ENV_FILE="deploy/environments/.env.staging_1k"
COMPOSE_FILE="deploy/staging-1k/docker-compose.staging-1k.yml"

cd "$PROJECT_ROOT"

echo "🛑 Stopping Staging 1K Environment..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down

echo "✅ Staging 1K Stopped."
