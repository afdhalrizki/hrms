import os, django, sys
from pathlib import Path

# Adjust paths
BACKEND_DIR = Path('d:/hr/hrms/backend')
sys.path.append(str(BACKEND_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
os.environ['DB_HOST'] = 'localhost'
os.environ['DB_PORT'] = '6432'
os.environ['DB_USER'] = 'hrms_user'
os.environ['DB_PASSWORD'] = 'hrms_password'
os.environ['DB_NAME'] = 'hrms'
django.setup()

from django.contrib.auth import authenticate
from django_tenants.utils import schema_context
from tenants.models import Tenant

def test_auth():
    email = 'admin@company1.com'
    password = 'password123'
    
    tenant = Tenant.objects.get(schema_name='company1')
    with schema_context('company1'):
        user = authenticate(username=email, password=password)
        print(f"Auth for {email} in company1: {user}")
        
    with schema_context('public'):
        user = authenticate(username=email, password=password)
        print(f"Auth for {email} in public: {user}")

if __name__ == '__main__':
    test_auth()
