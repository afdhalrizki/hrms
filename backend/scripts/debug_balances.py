"""
UTILITY: Database Balance Debugger
Purpose: Directly inspects the PostgreSQL database to verify if LeaveBalance and 
Employee records exist for a specific tenant. Used to diagnose "No records found" UI issues.
Usage: backend/venv/bin/python backend/scripts/debug_balances.py
"""
import os
import sys
import django
from pathlib import Path

# Force local DB settings before anything else
os.environ['DB_HOST'] = '127.0.0.1'
os.environ['DB_PORT'] = '5433'
os.environ['DB_USER'] = 'hrms_user'
os.environ['DB_PASSWORD'] = 'hrms_password'
os.environ['TESTING'] = '1'

BACKEND_DIR = Path('/home/afdhal/data/hr/hrms/backend')
sys.path.append(str(BACKEND_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

django.setup()

from django.db import connection
from django_tenants.utils import schema_context
from attendance.models import LeaveBalance
from core.models import Employee

def check_balances(schema_name):
    try:
        with schema_context(schema_name):
            print(f"\n--- Balances for {schema_name} ---")
            balances = LeaveBalance.objects.all()
            if not balances.exists():
                print("   [!] No balances found.")
            for b in balances:
                print(f"   Employee: {b.employee.email}, Year: {b.year}, Remaining: {b.remaining_days}")
            
            # Check if employee1 exists in this tenant
            emp = Employee.objects.filter(email__contains='employee1').first()
            if emp:
                print(f"   Found target employee: {emp.email} (ID: {emp.id})")
            else:
                print("   [!] Target employee NOT found.")
    except Exception as e:
        print(f"Error checking {schema_name}: {e}")

if __name__ == "__main__":
    check_balances('company1')
    check_balances('worker_0')
