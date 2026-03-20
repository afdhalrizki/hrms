from django_tenants.test.cases import TenantTestCase
from django_tenants.utils import schema_context
from users.models import User
from core.models import Department
import pytest

class AuditVerificationTestCase(TenantTestCase):
    def test_verify_audit(self):
        with schema_context(self.tenant.schema_name):
            # Ensure a test user exists
            user, created = User.objects.get_or_create(
                email='audit_test@example.com',
                defaults={'first_name': 'Audit', 'last_name': 'Tester', 'is_staff': True}
            )
            if created:
                user.set_password('testpassword')
                user.save()

            # Test Department (AuditModel)
            dept = Department(name="Audit Test Dept")
            
            # Manually passing user to save() as the AuditModelMixin would do in a ViewSet
            dept.save(user=user)
            
            # Verify
            assert dept.created_by == user
            assert dept.updated_by == user
            
            # Test Update
            dept.name = "Audit Test Dept Updated"
            dept.save(user=user)
            
            assert dept.updated_by == user
