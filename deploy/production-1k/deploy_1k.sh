#!/bin/bash

# --- HRMS Basic Deploy Script (Production 1K) ---

set -e

COMPOSE_FILE="deploy/production-1k/docker-compose.1k.yml"
ENV_FILE="deploy/environments/.env.production_1k"

echo "🏗️ Deploying HRMS Production 1K..."

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: $ENV_FILE not found."
    exit 1
fi

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build --remove-orphans

echo "✅ Deployment initiated."
echo "Monitor logs using: docker compose -f $COMPOSE_FILE --env-file $ENV_FILE logs -f"
