import os
import sys
import django
import argparse
from pathlib import Path
from dotenv import load_dotenv
from concurrent.futures import ProcessPoolExecutor, as_completed

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
    if 'redis://redis:6379' in os.environ.get('REDIS_URL', ''):
        os.environ['REDIS_URL'] = os.environ['REDIS_URL'].replace('redis:6379', '127.0.0.1:6380')
    os.environ['ENABLE_EMAIL_NOTIFICATIONS'] = 'False'

# Setup Django
sys.path.append(str(BACKEND_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection
from django.core.management import call_command
from seeds.core import setup_tenant, seed_base_data, create_public_data
from seeds.attendance import seed_attendance_data
from seeds.payroll import seed_payroll_data
from seeds.reimbursement import seed_reimbursement_data
from seeds.performance import seed_performance_data

def clean_slate():
    """Nuclear cleanup: Truncate tables and DROP all non-public schemas."""
    from django.db import connection, transaction
    with connection.cursor() as cursor:
        print("   🧹 Cleaning up existing tenants and users...")
        
        # 1. Truncate shared tables
        cursor.execute("TRUNCATE TABLE tenants_tenant CASCADE;")
        cursor.execute("TRUNCATE TABLE tenants_registrationrequest CASCADE;")
        cursor.execute("TRUNCATE TABLE users_user CASCADE;")
        
        # 2. Reset sequences
        cursor.execute("ALTER SEQUENCE IF EXISTS tenants_tenant_id_seq RESTART WITH 1;")
        cursor.execute("ALTER SEQUENCE IF EXISTS users_user_id_seq RESTART WITH 1;")
        
        # 3. Drop all schemas except protected ones
        cursor.execute("SELECT schema_name FROM information_schema.schemata;")
        schemas = [row[0] for row in cursor.fetchall()]
        protected_schemas = ['public', 'information_schema', 'pg_catalog', 'pg_toast']
        
        for schema in schemas:
            if schema not in protected_schemas and not schema.startswith('pg_'):
                print(f"      🗑️ Dropping stale schema: {schema}")
                cursor.execute(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE;')
        
        if not connection.get_autocommit():
            transaction.commit()
            
        print("   ✅ Cleanup finished.")

def seed_worker_data(schema_name, preset):
    """Subprocess function to seed data into an existing schema."""
    import django
    django.setup()
    from tenants.models import Tenant
    from django.db import connection
    
    # Close any inherited connections to avoid issues in subprocess
    connection.close()
    
    tenant = Tenant.objects.get(schema_name=schema_name)
    print(f"   🏗️ Seeding data for {schema_name} (preset={preset})...")
    
    res = seed_base_data(tenant)
    if preset in ('full', 'mobile'):
        seed_attendance_data(tenant, res['employees'][0])
        seed_payroll_data(tenant, res['admin_emp'])
        seed_reimbursement_data(tenant, res['employees'][0])
        seed_performance_data(tenant, res['employees'][0])
    return schema_name

def migrate_single_tenant_schema(schema_name):
    """Subprocess function to migrate a tenant schema."""
    import django
    django.setup()
    from django.db import connection
    from django.core.management import call_command
    import time
    
    # Close any inherited connections to avoid issues in subprocess
    connection.close()
    
    print(f"   🏗️ Migrating schema for {schema_name}...")
    for attempt in range(3):
        try:
            call_command('migrate_schemas', tenant=True, schema_name=schema_name, interactive=False, verbosity=0)
            break
        except Exception as e:
            if attempt == 2: raise
            print(f"      Retrying migration for {schema_name}... ({e})")
            time.sleep(2)
    return schema_name

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--workers', type=int, default=4)
    parser.add_argument('--preset', choices=['minimal', 'full', 'mobile'], default='full')
    parser.add_argument('--no-cleanup', action='store_true')
    args = parser.parse_args()

    print(f"🚀 Starting Test DB Seeding ({args.workers} workers, preset={args.preset})...")

    if not args.no_cleanup:
        clean_slate()

    print("--- Migrating Public Schema ---")
    call_command('migrate_schemas', shared=True, interactive=False, verbosity=0)
    create_public_data()

    print("--- Creating Tenant Records and Domains (Serial) ---")
    schemas = ['company1', 'company2'] + [f'worker_{i}' for i in range(args.workers)]
    from tenants.models import Tenant, Domain
    for schema in schemas:
        tenant, _ = Tenant.objects.get_or_create(
            schema_name=schema, 
            defaults={
                'name': schema.capitalize(), 
                'plan_type': 'ENTERPRISE',
                'enabled_modules': ["performance", "core", "attendance", "payroll", "reimbursement"],
                'late_deduction_rate': 50000,
                'absence_deduction_rate': 100000,
                'attendance_platform_policy': 'BOTH'
            }
        )
        Domain.objects.update_or_create(
            domain=f'{schema}.localhost', 
            defaults={'tenant': tenant, 'is_primary': True}
        )

    print("--- Migrating Tenant Schemas (Parallel) ---")
    # Close connection before parallel execution to prevent inheritance issues
    connection.close()
    
    with ProcessPoolExecutor(max_workers=min(len(schemas), 8)) as executor:
        futures = [
            executor.submit(migrate_single_tenant_schema, schema)
            for schema in schemas
        ]
        for future in as_completed(futures):
            try:
                name = future.result()
                print(f"      ✅ Finished migrating schema {name}")
            except Exception as e:
                print(f"      ❌ Migration failed: {e}")
                sys.exit(1)

    # 1. Seed critical test tenants serially to ensure data integrity
    print("--- Seeding Critical Tenants (Serial) ---")
    critical_tasks = [
        ('company1', args.preset),
        ('company2', 'minimal'),
    ]
    for s, p in critical_tasks:
        seed_worker_data(s, p)

    # 2. Seed generic workers in parallel if requested
    if args.workers > 0:
        print(f"--- Seeding Workers (Parallel: {args.workers}) ---")
        worker_tasks = [(f'worker_{i}', args.preset) for i in range(args.workers)]
        
        with ProcessPoolExecutor(max_workers=min(args.workers, 8)) as executor:
            futures = [executor.submit(seed_worker_data, s, p) for s, p in worker_tasks]
            for future in as_completed(futures):
                try:
                    name = future.result()
                    print(f"      ✅ Finished seeding {name}")
                except Exception as e:
                    print(f"      ❌ Seeding failed: {e}")

    print("\n--- Seeding Completed Successfully ---")

if __name__ == "__main__":
    main()
