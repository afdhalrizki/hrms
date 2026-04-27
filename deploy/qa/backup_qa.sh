#!/bin/bash

# --- HRMS QA Backup Script ---
# This script creates a compressed backup of the QA database.
# Usage: ./backup_qa.sh

set -e
set -o pipefail

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." &> /dev/null && pwd )"
ENV_FILE="$PROJECT_ROOT/deploy/environments/.env.qa"
BACKUP_DIR="$PROJECT_ROOT/backups"
TIMESTAMP=$(date +%F_%H-%M-%S)
RETENTION_DAYS=7

# Check if env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: .env.qa file not found at $ENV_FILE"
    exit 1
fi

# Load database variables from .env.qa
# Using grep and sed to avoid sourcing the whole file which might have export-unfriendly lines
DB_NAME=$(grep "^POSTGRES_DB=" "$ENV_FILE" | cut -d'=' -f2)
DB_USER=$(grep "^POSTGRES_USER=" "$ENV_FILE" | cut -d'=' -f2)
DB_CONTAINER="hrms-db"

if [ -z "$DB_NAME" ] || [ -z "$DB_USER" ]; then
    echo "Error: Could not find POSTGRES_DB or POSTGRES_USER in $ENV_FILE"
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "--- Starting Database Backup for HRMS QA ---"
echo "Target: $DB_NAME"
echo "Container: $DB_CONTAINER"
echo "Output: $BACKUP_DIR/qa_backup_$TIMESTAMP.sql.gz"

# Run pg_dump inside container and compress output
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_DIR/qa_backup_$TIMESTAMP.sql.gz"

if [ $? -eq 0 ]; then
    echo "✅ Backup successful!"
else
    echo "❌ Backup failed!"
    exit 1
fi

# Cleanup old backups (older than $RETENTION_DAYS)
echo "--- Cleaning up backups older than $RETENTION_DAYS days ---"
find "$BACKUP_DIR" -name "qa_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "Cleanup finished."

echo "--- Backup Process Completed ---"
