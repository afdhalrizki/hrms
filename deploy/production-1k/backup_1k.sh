#!/bin/bash

# --- HRMS Backup Script (Production 1K) ---
# Backs up the PostgreSQL database to a compressed .sql.gz file.

set -e

# Configuration
BACKUP_DIR="backups/production-1k"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="hrms_prod_1k_$TIMESTAMP.sql.gz"
ENV_FILE="deploy/environments/.env.production_1k"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: Environment file $ENV_FILE not found!"
    exit 1
fi

# Load database credentials from env file
DB_USER=$(grep -E "^DB_USER=" "$ENV_FILE" | cut -d '=' -f2 | tr -d '\r')
DB_NAME=$(grep -E "^DB_NAME=" "$ENV_FILE" | cut -d '=' -f2 | tr -d '\r')
CONTAINER_NAME="hrms-db-prod-1k"

echo "📦 Starting Database Backup for Production 1K..."

# Check if database container is running
if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
    echo "🔍 Container $CONTAINER_NAME is running. Performing pg_dump..."
    docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_DIR/$BACKUP_NAME"
    echo "✅ Backup completed: $BACKUP_DIR/$BACKUP_NAME"
    
    # Optional: Delete backups older than 30 days
    find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +30 -delete
    echo "🧹 Cleaned up old backups (older than 30 days)."
else
    echo "⚠️ Warning: Container $CONTAINER_NAME is not running. Skipping backup."
    # If it's a first deploy, we don't want to fail the script.
fi
