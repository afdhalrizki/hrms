#!/bin/bash

# --- HRMS Backup Script (Staging 1K) ---
# Backs up the PostgreSQL database for the Staging environment.

set -e

# Configuration
BACKUP_DIR="backups/staging-1k"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="hrms_staging_1k_$TIMESTAMP.sql.gz"
ENV_FILE="deploy/environments/.env.staging_1k"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: Environment file $ENV_FILE not found!"
    exit 1
fi

# Load database credentials from env file
DB_USER=$(grep DB_USER "$ENV_FILE" | cut -d '=' -f2)
DB_NAME=$(grep DB_NAME "$ENV_FILE" | cut -d '=' -f2)
CONTAINER_NAME="hrms-db-staging-1k"

echo "📦 Starting Database Backup for Staging 1K..."

# Check if database container is running
if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
    echo "🔍 Container $CONTAINER_NAME is running. Performing pg_dump..."
    docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_DIR/$BACKUP_NAME"
    echo "✅ Backup completed: $BACKUP_DIR/$BACKUP_NAME"
    
    # Clean up backups older than 7 days for staging
    find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +7 -delete
    echo "🧹 Cleaned up old backups (older than 7 days)."
else
    echo "⚠️ Warning: Container $CONTAINER_NAME is not running. Skipping backup."
fi
