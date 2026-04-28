#!/bin/bash

# --- HRMS Production 10K Backup Script ---
# Optimized for high-volume database and off-site synchronization.
# -------------------------------------------------------------

set -e
set -o pipefail

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." &> /dev/null && pwd )"
ENV_FILE="$PROJECT_ROOT/deploy/environments/.env.production_10k"
BACKUP_DIR="$PROJECT_ROOT/backups/production-10k"
TIMESTAMP=$(date +%F_%H-%M-%S)
RETENTION_DAYS=14 # Longer retention for production

# Check if env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: $ENV_FILE not found!"
    exit 1
fi

# Load variables
DB_NAME=$(grep -E "^(POSTGRES_DB|DB_NAME)=" "$ENV_FILE" | head -n 1 | cut -d'=' -f2)
DB_USER=$(grep -E "^(POSTGRES_USER|DB_USER)=" "$ENV_FILE" | head -n 1 | cut -d'=' -f2)
DB_CONTAINER=$(grep "^DB_CONTAINER=" "$ENV_FILE" | cut -d'=' -f2)
DB_CONTAINER=${DB_CONTAINER:-hrms-db-prod-10k}

mkdir -p "$BACKUP_DIR"

echo "--- 📦 Starting Production-10K Backup ---"
echo "Target DB: $DB_NAME"
echo "Timestamp: $TIMESTAMP"

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^$DB_CONTAINER$"; then
    echo "⚠️ Container $DB_CONTAINER is not running. Skipping backup (likely first deployment)."
else
    # Run parallel pg_dump if possible, or standard dump for safety
    # We use -Fc (custom format) for faster restores and smaller size
    if docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -Fc "$DB_NAME" > "$BACKUP_DIR/prod_backup_$TIMESTAMP.dump"; then
        echo "✅ Database dump completed successfully."
    else
        echo "❌ Database dump failed!"
        exit 1
    fi
fi

# Off-site Synchronization (Recommended in Roadmap)
echo "--- ☁️ Syncing to Off-site Storage (Placeholder) ---"
# rclone sync "$BACKUP_DIR" remote:hrms-backups/production-10k
echo "Skipping off-site sync: Configure rclone to enable this feature."

# Cleanup old backups
echo "--- 🧹 Cleaning up backups older than $RETENTION_DAYS days ---"
find "$BACKUP_DIR" -name "prod_backup_*.dump" -mtime +$RETENTION_DAYS -delete

echo "--- 🚀 Backup Process Finished ---"
