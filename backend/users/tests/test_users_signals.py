from django_tenants.test.cases import FastTenantTestCase as TenantTestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django_tenants.utils import schema_context, get_public_schema_name
from tenants.models import Tenant

User = get_user_model()

class UsersSignalsTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.tenant.max_admins = 2
        self.tenant.save()
        
        self.admin1 = User.objects.create_user(email='admin1@test.com', password='pwd', is_staff=True)
        self.admin1.tenants.add(self.tenant)
        self.admin2 = User.objects.create_user(email='admin2@test.com', password='pwd', is_staff=True)
        self.admin2.tenants.add(self.tenant)

    def test_prevent_last_admin_removal_from_tenant(self):
        # Admin 2 should be removable since Admin 1 is still there
        self.admin2.tenants.remove(self.tenant)
        self.assertEqual(self.admin2.tenants.count(), 0)
        
        # Admin 1 cannot be removed because they are the last admin
        with self.assertRaisesMessage(ValidationError, "Cannot remove user from tenant"):
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

    def test_prevent_admin_overflow_pre_save(self):
        # Current admins: admin1, admin2 (max 2)
        # Creating a 3rd user normal
        user3 = User.objects.create_user(email='user3@test.com', password='pwd', is_staff=False)
        user3.tenants.add(self.tenant)
        
        # Demoting admin2 so we only have 1 admin
        self.admin2.is_staff = False
        self.admin2.save()
        
        # Now 1 admin. Promoting user3 should work!
        user3.is_staff = True
        user3.save()
        
        # Now back to 2 admins. Adding a new user and promoting should fail!
        user4 = User.objects.create_user(email='user4@test.com', password='pwd', is_staff=False)
        user4.tenants.add(self.tenant)
        
        user4.is_staff = True
        with self.assertRaisesMessage(ValidationError, "Batas maksimal administrator"):
            user4.save()

    def test_prevent_admin_overflow_m2m_pre_add(self):
        # We start with 2 admins. Max is 2.
        # Create pre-existing admins not assigned to this tenant
        external_admin = User.objects.create_user(email='ext@test.com', password='pwd', is_staff=True)
        external_admin2 = User.objects.create_user(email='ext2@test.com', password='pwd', is_staff=True)
        
        from django.db import transaction

        # Adding to tenant should fail due to M2M overflow
        with transaction.atomic():
            with self.assertRaisesMessage(ValidationError, "Batas maksimal administrator"):
                external_admin.tenants.add(self.tenant)

        # Adding to tenant using reverse accessor should fail
        with transaction.atomic():
            with self.assertRaisesMessage(ValidationError, "Batas maksimal administrator"):
                self.tenant.users.add(external_admin2)

    def test_create_user_manager_exceptions(self):
        with self.assertRaisesMessage(ValueError, "The Email field must be set"):
            User.objects.create_user(email='')

        with self.assertRaisesMessage(ValueError, "Superuser must have is_staff=True"):
            User.objects.create_superuser(email='super1@test.com', is_staff=False)

        with self.assertRaisesMessage(ValueError, "Superuser must have is_superuser=True"):
            User.objects.create_superuser(email='super2@test.com', is_superuser=False)

    def test_user_properties_fallback(self):
        # Just standard coverage for edge cases
        self.assertEqual(self.admin1.permissions, {}) # No employee obj
        self.assertEqual(self.admin1.role, 'ADMIN') # because is_staff is True
        
        global_admin = User.objects.create_superuser(email='global@test.com')
        self.assertEqual(global_admin.role, 'SUPERADMIN')
