import os, sys, django
# Add the parent directory (backend root) to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
os.environ['DB_HOST'] = 'localhost'
os.environ['DB_PORT'] = '5432'
os.environ['DB_NAME'] = 'hrms'
os.environ['DB_USER'] = 'hrms_user'
os.environ['DB_PASSWORD'] = 'hrms_password'
django.setup()

from users.models import User
try:
    u = User.objects.get(email='admin@company1.com')
    print(f"User found: {u.email}")
    print(f"Password Check: {u.check_password('password123')}")
    print(f"Is Staff: {u.is_staff}")
    print(f"Tenants: {[t.schema_name for t in u.tenants.all()]}")
except User.DoesNotExist:
    print("User admin@company1.com NOT found")
except Exception as e:
    print(f"Error: {e}")
