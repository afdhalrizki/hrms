import os
import sys

# Setup paths and environment
sys.path.append('backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Load env variables for DB
from dotenv import load_dotenv
from pathlib import Path
ENV_FILE = Path('deploy/environments/.env.local')
if ENV_FILE.exists():
    load_dotenv(ENV_FILE)
    if os.environ.get('DB_HOST') == 'db':
        os.environ['DB_HOST'] = '127.0.0.1'
    if os.environ.get('DB_PORT') == '5432':
        os.environ['DB_PORT'] = '5433'

import django
django.setup()

from django_tenants.utils import schema_context
from core.models import AuditLog

with schema_context('company1'):
    logs = AuditLog.objects.order_by('-timestamp')[:10]
    for log in logs:
        print(f"[{log.timestamp}] {log.action_type} {log.model_name} id={log.object_id}")
        print(f"  Fields: {log.changed_fields}")
