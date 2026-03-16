import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django_tenants.utils import schema_context
from users.models import User
from core.models import Department

def verify_audit():
    with schema_context('company1'):
        # Ensure a test user exists
        user, created = User.objects.get_or_create(
            email='audit_test@example.com',
            defaults={'first_name': 'Audit', 'last_name': 'Tester', 'is_staff': True}
        )
        if created:
            user.set_password('testpassword')
            user.save()

        print(f"Testing with user: {user.email}")

        # Test Department (AuditModel)
        dept = Department(name="Audit Test Dept")
        
        # Manually passing user to save() as the AuditModelMixin would do in a ViewSet
        dept.save(user=user)
        
        print(f"Created Department: {dept.name}")
        print(f"Created By: {dept.created_by.email if dept.created_by else 'None'}")
        print(f"Updated By: {dept.updated_by.email if dept.updated_by else 'None'}")
        
        # Verify
        assert dept.created_by == user
        assert dept.updated_by == user
        
        # Test Update
        dept.name = "Audit Test Dept Updated"
        dept.save(user=user)
        
        print(f"Updated Department: {dept.name}")
        print(f"Updated By (after change): {dept.updated_by.email}")
        
        print("\nAudit Trail Verification SUCCESSful! village")

if __name__ == "__main__":
    verify_audit()
