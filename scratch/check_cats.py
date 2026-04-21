import os
import sys
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path('/home/afdhal/data/hr/hrms')
BACKEND_DIR = ROOT_DIR / 'backend'
ENV_FILE = ROOT_DIR / 'deploy' / 'environments' / '.env.local'

if ENV_FILE.exists():
    load_dotenv(ENV_FILE)

# Local overrides (as in seed_test_db.py)
if os.environ.get('DB_HOST') == 'db':
    os.environ['DB_HOST'] = '127.0.0.1'
if os.environ.get('DB_PORT') == '5432':
    os.environ['DB_PORT'] = '5433'

sys.path.append(str(BACKEND_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django_tenants.utils import schema_context
from reimbursement.models import ReimbursementCategory

with schema_context('company1'):
    cats = list(ReimbursementCategory.objects.all())
    print(f"Categories in company1: {[c.name for c in cats]}")
