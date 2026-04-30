#!/bin/bash

# --- HRMS Teardown Script (Production 1K) ---

set -e

COMPOSE_FILE="deploy/production-1k/docker-compose.1k.yml"
ENV_FILE="deploy/environments/.env.production_1k"

echo "🛑 Stopping and removing Production 1K containers..."

if [ ! -f "$ENV_FILE" ]; then
    echo "⚠️ Warning: $ENV_FILE not found. Proceeding without env file..."
    docker compose -f "$COMPOSE_FILE" down
else
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
fi

echo "✅ Production 1K services stopped."
