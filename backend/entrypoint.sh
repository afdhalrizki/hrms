#!/bin/bash

# HRMS Entrypoint Script
# Handles DB migrations and server startup

set -e

# Wait for Database
echo "⏳ Waiting for database..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER"; do
  sleep 2
done
echo "✅ Database is ready!"

# Determine if we should run production or dev server
if [ "$DEBUG" = "False" ] || [ "$PRODUCTION" = "True" ]; then
    echo "🚀 Starting Production Server (Gunicorn)..."
    
    # Collect static files for production
    echo "📦 Collecting static files..."
    python manage.py collectstatic --noinput
    
    # Start Gunicorn with gevent workers for high concurrency
    # Tuning based on environment variables
    WORKERS=${GUNICORN_WORKERS:-4}
    THREADS=${GUNICORN_THREADS:-2}
    TIMEOUT=${GUNICORN_TIMEOUT:-60}
    
    exec gunicorn config.wsgi:application \
        --bind 0.0.0.0:8000 \
        --workers "$WORKERS" \
        --worker-class gevent \
        --threads "$THREADS" \
        --timeout "$TIMEOUT" \
        --access-logfile - \
        --error-logfile -
else
    echo "🛠️ Starting Development Server..."
    exec python manage.py runserver 0.0.0.0:8000
fi
