#!/bin/bash
export DEBUG=True
export SECRET_KEY=dev-secret-key-1234567890-long-enough-for-sha256
export DB_PORT=6432
export DB_NAME=hrms
export DB_HOST=localhost
export DB_USER=hrms_user
export DB_PASSWORD=hrms_password
export REDIS_URL=redis://localhost:6379/1
export ALLOWED_HOSTS=localhost,127.0.0.1,.localhost
export TENANT_DOMAIN_SUFFIX=localhost

source venv/bin/activate
# Run without --noreload to enable auto-reloading
python manage.py runserver 0.0.0.0:8000
