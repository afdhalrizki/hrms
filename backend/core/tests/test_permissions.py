from unittest.mock import Mock, MagicMock
from django.test import RequestFactory, TestCase
from django.contrib.auth import get_user_model
from django_tenants.test.cases import TenantTestCase
from core.permissions import TenantAccessPermission, HasRBACPermission, FeatureRequiredPermission
from core.models import Employee, AccessRole
from tenants.models import Tenant

User = get_user_model()

class PermissionsTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.factory = RequestFactory()
        
        self.regular_user = User.objects.create_user(email='perm_user@test.com', password='pwd')
        self.regular_user.tenants.add(self.tenant)
        self.supervisor_user = User.objects.create_user(email='spv@test.com', password='pwd')
        self.supervisor_user.tenants.add(self.tenant)
        self.admin_user = User.objects.create_user(email='admin@test.com', password='pwd', is_staff=True)
        self.global_admin = User.objects.create_user(email='global@test.com', password='pwd', is_superuser=True)
        
        self.role_with_perm = AccessRole.objects.create(name='Manager Role', permissions={'manage_attendance': True})
        self.role_without_perm = AccessRole.objects.create(name='Staff Role', permissions={'manage_attendance': False})

        self.spv_emp = Employee.objects.create(email=self.supervisor_user.email, fullname="Spv", nik="SPV01", join_date="2024-01-01", ktp_number="123")
        self.user_emp = Employee.objects.create(email=self.regular_user.email, fullname="User", nik="USR01", supervisor=self.spv_emp, join_date="2024-01-01", ktp_number="456", access_role=self.role_without_perm)

    def test_tenant_access_permission(self):
        perm = TenantAccessPermission()
        view = Mock(allow_self_service=False, detail=False)
        
        # Unauthenticated
        request = self.factory.get('/')
        request.user = Mock(is_authenticated=False)
        self.assertFalse(perm.has_permission(request, view))

        # Global admin bypass
        request.user = self.global_admin
        self.assertTrue(perm.has_permission(request, view))

        # Valid tenant assignment
        request.user = self.regular_user
        request.tenant = self.tenant
        self.assertTrue(perm.has_permission(request, view))

        # Invalid tenant assignment
        from django_tenants.utils import schema_context, get_public_schema_name
        with schema_context(get_public_schema_name()):
            other_tenant = Tenant.objects.create(schema_name='other', name='Other')
        request.tenant = other_tenant
        self.assertFalse(perm.has_permission(request, view))

    def test_has_rbac_permission_public_schema(self):
        perm = HasRBACPermission()
        view = Mock(allow_self_service=False, detail=False)
        request = self.factory.get('/')
        request.user = self.regular_user
        
        from tenants.models import Tenant
        public_tenant = Mock(spec=Tenant)
        public_tenant.schema_name = 'public'
        request.tenant = public_tenant
        
        self.assertFalse(perm.has_permission(request, view))

    def test_has_rbac_permission_no_employee(self):
        perm = HasRBACPermission()
        view = Mock(allow_self_service=False, detail=False)
        request = self.factory.get('/')
        # Stranger with no employee record
        stranger = User.objects.create_user(email='stranger@test.com', password='pwd')
        request.user = stranger
        request.tenant = self.tenant
        
        self.assertFalse(perm.has_permission(request, view))

    def test_has_rbac_permission_admin_bypass(self):
        perm = HasRBACPermission()
        view = Mock(allow_self_service=False, detail=False)
        request = self.factory.get('/')
        request.user = self.admin_user
        request.tenant = self.tenant
        
        self.assertTrue(perm.has_permission(request, view))

    def test_has_rbac_permission_with_rbac(self):
        perm = HasRBACPermission()
        view = Mock(allow_self_service=False, detail=False)
        view.required_rbac_permission = 'manage_attendance'
        
        request = self.factory.post('/')
        request.user = self.regular_user # Has no manage_attendance perm
        request.tenant = self.tenant
        
        self.assertFalse(perm.has_permission(request, view))

        # But GET is allowed
        request_get = self.factory.get('/')
        request_get.user = self.regular_user
        request_get.tenant = self.tenant
        self.assertTrue(perm.has_permission(request_get, view))

        # Now let's test a user WITH the permission
        self.user_emp.access_role = self.role_with_perm
        self.user_emp.save()
        self.assertTrue(perm.has_permission(request, view))

    def test_has_rbac_permission_self_service(self):
        perm = HasRBACPermission()
        view = Mock(allow_self_service=True, detail=False, required_rbac_permission='manage_attendance', action='create')
        
        request = self.factory.post('/')
        request.user = self.regular_user # Has no manage_attendance
        request.tenant = self.tenant
        
        self.assertTrue(perm.has_permission(request, view))

        # If action is not standard self-service
        view.action = 'approve'
        self.assertFalse(perm.has_permission(request, view))
        
        # If it's a detail action, it passes has_permission to hit has_object_permission
        view.detail = True
        self.assertTrue(perm.has_permission(request, view))

    def test_has_rbac_object_permission(self):
        perm = HasRBACPermission()
        view = Mock(allow_self_service=False, detail=False, required_rbac_permission='manage_attendance', action='retrieve')
        
        request = self.factory.get('/')
        request.user = self.regular_user
        request.tenant = self.tenant
        
        # 1. Owner can retrieve
        obj = self.user_emp # The owner is self.regular_user
        self.assertTrue(perm.has_object_permission(request, view, obj))
        
        # 2. Owner cannot approve
        view.action = 'approve'
        self.assertFalse(perm.has_object_permission(request, view, obj))
        
        # 3. Supervisor can approve
        request.user = self.supervisor_user
        self.assertTrue(perm.has_object_permission(request, view, obj))

        # 4. Unrelated stranger cannot approve
        stranger = Employee.objects.create(email='stranger2@test.com', fullname="Str", nik="STR01", join_date="2024-01-01", ktp_number="999")
        stranger_user = User.objects.create_user(email='stranger2@test.com', password='pwd')
        request.user = stranger_user
        self.assertFalse(perm.has_object_permission(request, view, obj))
        
        # 5. Admin can approve
        request.user = self.admin_user
        self.assertTrue(perm.has_object_permission(request, view, obj))

    def test_feature_required_permission(self):
        perm = FeatureRequiredPermission()
        view = Mock(required_feature='payroll')
        
        request = self.factory.get('/')
        request.tenant = self.tenant
        
        # Default is ENTERPRISE so it passes
        self.tenant.plan_type = 'ENTERPRISE'
        self.assertTrue(perm.has_permission(request, view))
        
        self.tenant.plan_type = 'ESSENTIAL'
        self.tenant.enabled_modules = ['core']
        self.assertFalse(perm.has_permission(request, view))
        
        self.tenant.enabled_modules = ['core', 'payroll']
        self.assertTrue(perm.has_permission(request, view))
