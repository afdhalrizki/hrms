#!/bin/bash

# --- HRMS QA SSL Setup Script ---
# This script uses Certbot to obtain SSL certificates from Let's Encrypt.

DOMAIN="harikerja.web.id"
EMAIL="admin@harikerja.web.id" # Replace with your email

echo "🚀 Starting SSL Certificate acquisition for $DOMAIN..."

# 1. Ensure directories exist
mkdir -p deploy/qa/certbot/conf
mkdir -p deploy/qa/certbot/www

# 2. Restart Nginx to apply challenge configuration
echo "🔄 Restarting Nginx to prepare for ACME challenge..."
docker compose -f deploy/qa/docker-compose.qa.yml restart nginx

# 3. Request Certificate
echo "🔐 Requesting certificate from Let's Encrypt..."
docker run -it --rm --name certbot \
    -v "$(pwd)/deploy/qa/certbot/conf:/etc/letsencrypt" \
    -v "$(pwd)/deploy/qa/certbot/www:/var/www/certbot" \
    certbot/certbot certonly --webroot -w /var/www/certbot \
    -d "$DOMAIN" \
    --email "$EMAIL" --agree-tos --no-eff-email

if [ $? -eq 0 ]; then
    echo "✅ SSL Certificate obtained successfully!"
    echo "Next: We will update Nginx configuration to use the certificates."
else
    echo "❌ Failed to obtain SSL Certificate."
    echo "Possible causes: DNS not propagated yet, or port 80 is blocked."
fi
