import os
import django
import sys

# Setup django
sys.path.append('/home/afdhal/data/hr/hrms/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hrms.settings')
django.setup()

from tenants.serializers import TenantSettingsSerializer
from tenants.models import Tenant

def test_serializer():
    # We don't need a real tenant for this, just check the fields
    serializer = TenantSettingsSerializer()
    fields = serializer.fields.keys()
    
    expected = ['late_deduction_rate', 'absence_deduction_rate', 'jkk_rate', 'reimbursement_approval_level']
    
    print("Fields in serializer:", list(fields))
    
    for field in expected:
        if field in fields:
            print(f"SUCCESS: {field} found in serializer.")
        else:
            print(f"FAILURE: {field} NOT found in serializer.")

if __name__ == "__main__":
    test_serializer()
