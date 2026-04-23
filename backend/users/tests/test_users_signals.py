from core.tests.base import BaseHRTestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django_tenants.utils import schema_context, get_public_schema_name
from tenants.models import Tenant

User = get_user_model()

class UsersSignalsTestCase(BaseHRTestCase):
    def setUp(self):
        super().setUp()
        # DEBUG
        all_admins = list(User.objects.filter(tenants=self.tenant, is_staff=True))
        print(f"DEBUG: Admins for {self.tenant.schema_name} before cleanup: {[u.email for u in all_admins]}")
        print(f"DEBUG: self.admin_user.pk: {self.admin_user.pk}")
        
        # We MUST clear any extra admins that might have been left by other classes (like AdminSafeguardTestCase).
        # This ensures our "last admin" logic works in isolation.
        # We use .remove() instead of .delete() because these users might be last admins 
        # of OTHER tenants in the shared test database.
        for u in User.objects.filter(tenants=self.tenant, is_staff=True).exclude(pk=self.admin_user.pk):
            u.tenants.remove(self.tenant)

        self.tenant.max_admins = 5
        self.tenant.save()
        
        # admin1 is provided by BaseHRTestCase
        self.admin1 = self.admin_user
        
        # Create a second admin for testing non-last-admin operations
        self.admin2 = User.objects.create_user(email='sig2_isolated@test.com', password='pwd', is_staff=True)
        self.admin2.tenants.add(self.tenant)

    def test_prevent_last_admin_removal_from_tenant(self):
        # Admin 2 should be removable since Admin 1 is still there
        self.admin2.tenants.remove(self.tenant)
        self.assertEqual(self.admin2.tenants.count(), 0)
        
        # Admin 1 cannot be removed because they are the last admin
        with self.assertRaisesMessage(ValidationError, "They are the last active administrator"):
            self.admin1.tenants.remove(self.tenant)

    def test_prevent_last_admin_deletion(self):
        # Admin 2 deleted fine
        self.admin2.delete()
        
        # Admin 1 cannot be deleted
        with self.assertRaisesMessage(ValidationError, "must have at least one active administrator"):
            self.admin1.delete()

    def test_prevent_last_admin_demotion(self):
        # Admin 2 can be demoted
        self.admin2.is_staff = False
        self.admin2.save()
        
        # Admin 1 cannot be demoted
        self.admin1.is_staff = False
        with self.assertRaisesMessage(ValidationError, "Cannot demote or deactivate user"):
            self.admin1.save()

    def test_prevent_admin_overflow_m2m_pre_add(self):
        # Limit is 2. Currently 2 admins (admin1, admin2).
        self.tenant.max_admins = 2
        self.tenant.save()

        external_admin = User.objects.create_user(email='ext_sig_isolated@test.com', password='pwd', is_staff=True)
        
        from django.db import transaction
        with transaction.atomic():
            with self.assertRaisesMessage(ValidationError, "Batas maksimal administrator"):
                external_admin.tenants.add(self.tenant)

    def test_create_user_manager_exceptions(self):
        with self.assertRaisesMessage(ValueError, "The Email field must be set"):
            User.objects.create_user(email='')

        with self.assertRaisesMessage(ValueError, "Superuser must have is_staff=True"):
            User.objects.create_superuser(email='super1_sig_isolated@test.com', is_staff=False)

    def test_user_properties_fallback(self):
        perms = self.admin1.permissions
        self.assertIsInstance(perms, dict)
        if perms:
            self.assertFalse(any(perms.values()))
        
        self.assertEqual(self.admin1.role, 'ADMIN')
        
        global_admin = User.objects.create_superuser(email='global_sig_isolated@test.com')
        self.assertEqual(global_admin.role, 'SUPERADMIN')
