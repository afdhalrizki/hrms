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

# Load S3 configurations from env file
USE_S3=$(grep -E "^USE_S3=" "$ENV_FILE" | cut -d '=' -f2 | tr -d '\r')
AWS_ACCESS_KEY_ID=$(grep -E "^AWS_ACCESS_KEY_ID=" "$ENV_FILE" | cut -d '=' -f2 | tr -d '\r')
AWS_SECRET_ACCESS_KEY=$(grep -E "^AWS_SECRET_ACCESS_KEY=" "$ENV_FILE" | cut -d '=' -f2 | tr -d '\r')
AWS_STORAGE_BUCKET_NAME=$(grep -E "^AWS_STORAGE_BUCKET_NAME=" "$ENV_FILE" | cut -d '=' -f2 | tr -d '\r')
AWS_S3_ENDPOINT_URL=$(grep -E "^AWS_S3_ENDPOINT_URL=" "$ENV_FILE" | cut -d '=' -f2 | tr -d '\r')
AWS_S3_REGION_NAME=$(grep -E "^AWS_S3_REGION_NAME=" "$ENV_FILE" | cut -d '=' -f2 | tr -d '\r')

echo "📦 Starting Database Backup for Production 1K..."

# Check if database container is running
if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
    echo "🔍 Container $CONTAINER_NAME is running. Performing pg_dump..."
    docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_DIR/$BACKUP_NAME"
    echo "✅ Database backup completed locally: $BACKUP_DIR/$BACKUP_NAME"
    
    # =========================================================================
    # AUTOMATED OFF-SITE BACKUP TO BIZNET GIO NEO OBJECT STORAGE (S3-COMPATIBLE)
    # =========================================================================
    if [ "$USE_S3" = "True" ]; then
        echo "📤 USE_S3 is enabled. Preparing to push backup off-site..."
        
        # Check if AWS CLI is installed on the host
        if command -v aws &> /dev/null; then
            # Verify that credentials are configured and not default placeholders
            if [ -n "$AWS_ACCESS_KEY_ID" ] && [ -n "$AWS_SECRET_ACCESS_KEY" ] && \
               [ "$AWS_ACCESS_KEY_ID" != "your-biznet-neo-access-key-here" ]; then
                
                # Export credentials temporarily for this AWS CLI execution
                export AWS_ACCESS_KEY_ID
                export AWS_SECRET_ACCESS_KEY
                export AWS_DEFAULT_REGION="${AWS_S3_REGION_NAME:-id-jkt-1}"
                
                ENDPOINT="${AWS_S3_ENDPOINT_URL:-https://nos.id-jkt-1.neo.id}"
                
                echo "🚀 Uploading to Biznet GIO NEO Object Storage bucket '$AWS_STORAGE_BUCKET_NAME'..."
                if aws --endpoint-url="$ENDPOINT" s3 cp "$BACKUP_DIR/$BACKUP_NAME" "s3://$AWS_STORAGE_BUCKET_NAME/db_backups/$BACKUP_NAME"; then
                    echo "✅ Off-site backup uploaded successfully!"
                else
                    echo "⚠️ Warning: Upload to Biznet NEO Object Storage failed. Check your network or permissions."
                fi
            else
                echo "⚠️ Warning: S3 upload skipped. Credentials in $ENV_FILE are empty or using default placeholders."
            fi
        else
            echo "⚠️ Warning: AWS CLI ('aws' command) is not installed on the host. Unable to upload backup off-site."
            echo "💡 Tip: Run 'sudo apt install awscli' to install AWS CLI and enable automated S3 backup."
        fi
    else
        echo "ℹ️ Off-site backup is disabled (USE_S3 is False in env)."
    fi
    # =========================================================================
    
    # Optional: Delete local backups older than 30 days to save SSD space
    find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +30 -delete
    echo "🧹 Cleaned up old local backups (older than 30 days)."
else
    echo "❌ Error: Container $CONTAINER_NAME is not running. Database backup aborted!"
    exit 1
fi
