import os
import sys
import django
import argparse
from pathlib import Path
from dotenv import load_dotenv

# Setup paths
BACKEND_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BACKEND_DIR.parent
ENV_FILE = ROOT_DIR / 'deploy' / 'environments' / '.env.local'

# Load environment variables
if ENV_FILE.exists():
    load_dotenv(ENV_FILE)
    if os.environ.get('DB_HOST') == 'db':
        os.environ['DB_HOST'] = '127.0.0.1'
    if os.environ.get('DB_PORT') == '5432':
        os.environ['DB_PORT'] = '5433'

# Setup Django environment
sys.path.append(str(BACKEND_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
from django.core.management import call_command
django.setup()

from django.db import connection
from seeds.core import setup_tenant, seed_base_data, create_public_data
from seeds.attendance import seed_attendance_data
from seeds.payroll import seed_payroll_data
from seeds.reimbursement import seed_reimbursement_data
from seeds.performance import seed_performance_data

def main():
    import time
    for attempt in range(3):
        try:
            run_seeding()
            return
        except Exception as e:
            print(f"--- Seeding Attempt {attempt + 1} Failed: {e} ---")
            if attempt < 2:
                print("Retrying in 5 seconds...")
                time.sleep(5)
            else:
                raise e

def run_seeding():
    parser = argparse.ArgumentParser(description='Seed the test database.')
    parser.add_argument('--workers', type=int, default=8, help='Number of worker tenants to create.')
    parser.add_argument('--preset', type=str, default='full', choices=['minimal', 'mobile', 'full'], 
                        help='Seed preset: minimal (core only), mobile (core+attendance+payroll), full (everything).')
    parser.add_argument('--no-cleanup', action='store_true', help='Skip nuclear cleanup of existing schemas.')
    args = parser.parse_args()

    print(f"--- Seeding Test Database ---")
    print(f"    Mode: {args.preset.upper()}")
    print(f"    Workers: {args.workers}")

    # 1. Nuclear Cleanup (Optional)
    if not args.no_cleanup:
        print("--- Performing Nuclear Cleanup ---")
        with connection.cursor() as cursor:
            # Drop all tenant schemas except public/shared
            cursor.execute("SELECT schema_name FROM tenants_tenant WHERE schema_name NOT IN ('public', 'shared')")
            schemas = [row[0] for row in cursor.fetchall()]
            for schema in schemas:
                try:
                    cursor.execute(f"DROP SCHEMA IF EXISTS {schema} CASCADE")
                except Exception as e:
                    print(f"      Warning: Failed to drop schema {schema}: {e}")
            
            # Nuclear cleanup: Delete everything in public schema
            cursor.execute("TRUNCATE TABLE tenants_domain, users_user_tenants, tenants_tenant, users_user, tenants_registrationrequest RESTART IDENTITY CASCADE")

    # 1.5 Ensure public schema is migrated
    print("--- Migrating Public Schema ---")
    call_command('migrate_schemas', shared=True, interactive=False, verbosity=0)

    # 2. Public Data
    create_public_data()

    # 3. Tenants & Domain Data
    # We always seed 'company1' as the primary test tenant
    tenants_to_seed = [
        ('company1', 'Company One', False), # Full/Mobile/Minimal depends on preset
        ('company2', 'Company Two', True),  # Always minimal
    ]
    
    # Add worker tenants
    for i in range(args.workers):
        tenants_to_seed.append((f'worker_{i}', f'Worker Company {i}', False))

    for schema_name, company_name, force_minimal in tenants_to_seed:
        print(f"Seeding {schema_name}...")
        tenant = setup_tenant(schema_name, company_name)
        
        # Determine effective preset for this tenant
        effective_preset = 'minimal' if force_minimal else args.preset
        
        # A. Base Data (Users, Roles, Employees)
        res = seed_base_data(tenant)
        admin_emp = res['admin_emp']
        emp1 = res['employees'][0] # Use employee1 for domain data

        if effective_preset == 'minimal':
            continue

        # B. Domain Data
        if effective_preset in ['mobile', 'full']:
            seed_attendance_data(tenant, emp1)
            seed_payroll_data(tenant, admin_emp)
            seed_reimbursement_data(tenant, emp1)
            seed_performance_data(tenant, emp1)

    print("\n--- Seeding Completed Successfully ---")

if __name__ == '__main__':
    main()
